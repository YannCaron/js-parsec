# Proposition de seed growing pour js-parsec

Cette proposition utilise les APIs inspectées dans le checkout actuel. Les sources du projet ne sont pas modifiées. Le code ci-dessous a été essayé sur une copie isolée des sources.

Je commencerais par la récursion gauche directe. Le SeedGrowingHandler appartient à chaque Context et contient seulement les cellules en cours. Expression lui délègue les appels en utilisant son identité propre comme clé. Les résultats définitifs peuvent continuer à être mémorisés par le MemoizerHandler qui enveloppe les combinateurs.

Une cellule contient un meilleur fragment : résultat, position finale, effets de symboles et productions différées. Chaque essai part du même état, enregistre son fragment, puis annule ses changements. Un rappel récursif rejoue la meilleure seed ; avant le premier succès, cette seed vaut NotParsed. La boucle ne remplace un succès que si le nouvel essai va strictement plus loin. Elle rejoue finalement le meilleur fragment une seule fois dans le contexte appelant.

La version proposée désactive les lectures et écritures du cache ordinaire pendant les essais. Sans cela, Choice peut réutiliser une branche calculée avec une ancienne seed. Ce choix simplifie la correction, mais renonce aux garanties de performance Packrat dans ces régions. Il faudra mesurer avant une optimisation plus sélective.

Le nouveau Result.SeedGrowing visible dans le checkout ne doit pas sortir vers les combinateurs. La croissance est un état interne du handler. Les appels renvoient Parsed, NotParsed ou Continue ; Choice sait déjà traiter ces résultats selon son contrat actuel. Son traitement actuel de Continue limite par ailleurs les alternatives vides : ce prototype ne redéfinit pas ce contrat.

## Ajouter une opération spéculative au BacktrackingHandler

Ajouter cette méthode dans la classe existante. Elle réutilise handle() et son rollback. Le NotParsed retourné à handle() demande explicitement l'annulation de l'essai ; le résultat utile est conservé séparément. Une exception est propagée après cette annulation.

```ts
    probe<R>(lambda: (ctx: Context<T>) => R): R {
        let outcome: { value: R } | { error: unknown } | undefined
        this.handle(ctx => {
            try {
                outcome = { value: lambda(ctx) }
            } catch (error) {
                outcome = { error }
            }
            return Result.NotParsed
        })
        if (!outcome) throw new Error('Missing probe result.')
        if ('error' in outcome) throw outcome.error
        return outcome.value
    }
```

Ce helper repose sur les contrats actuels du moteur : captures équilibrées et productions différées pendant parse(). Il ne restaure pas des effets externes arbitraires, ni des mutations directes de la pile sémantique. Un build() reste une opération distincte, après reconnaissance.

## SeedGrowingHandler complet

Fichier proposé : js-parsec/src/runtime/handler/SeedGrowingHandler.ts. La pile détecte ici les cycles indirects et les rejette explicitement ; ils demandent une extension décrite plus bas.

```ts
import type Context from '../Context.ts'
import type { Parsem } from '../../Parsem.ts'
import type { ProductionEffect } from '../manager/ProductionEffectJournal.ts'
import type { SymbolInstruction } from '../manager/SymbolEffectJournal.ts'
import { Result } from '../Result.ts'

type Fragment<T> = {
    res: Result
    newPos: number
    symbolEffects: SymbolInstruction<T>[]
    instructionsDelta: ProductionEffect<T>[]
}

type Seed<T> = { best: Fragment<T>; recursive: boolean }
type Body<T> = (ctx: Context<T>) => Result

export default class SeedGrowingHandler<T> {
    private readonly cells = new Map<number, Map<Parsem<T>, Seed<T>>>()
    private readonly stack: Seed<T>[] = []

    constructor(private readonly ctx: Context<T>) {}

    get isActive(): boolean { return this.stack.length > 0 }

    handle(rule: Parsem<T>, body: Body<T>): Result {
        const pos = this.ctx.sourceManager.pos
        let row = this.cells.get(pos)
        if (!row) this.cells.set(pos, row = new Map())

        const current = row.get(rule)
        if (current) {
            if (this.stack[this.stack.length - 1] !== current)
                throw new Error('Indirect left recursion requires cycle tracking.')
            current.recursive = true
            return this.replay(current.best)
        }

        const seed: Seed<T> = {
            recursive: false,
            best: { res: Result.NotParsed, newPos: pos,
                symbolEffects: [], instructionsDelta: [] }
        }
        row.set(rule, seed)
        this.stack.push(seed)

        try {
            while (true) {
                const candidate = this.attempt(body)
                if (candidate.res === Result.NotParsed) break
                if (seed.best.res !== Result.NotParsed &&
                    candidate.newPos <= seed.best.newPos) break
                seed.best = candidate
                if (!seed.recursive) break
            }
            return this.replay(seed.best)
        } finally {
            this.stack.pop()
            row.delete(rule)
            if (row.size === 0) this.cells.delete(pos)
        }
    }

    private attempt(body: Body<T>): Fragment<T> {
        const ctx = this.ctx
        const productionStart = ctx.productionEffectJournal.length
        const symbolStart = ctx.symbolEffectJournal.startRecording()
        try {
            return ctx.backtrackingHandler.probe(ctx => {
                const res = ctx.backtrackingHandler.handle(body)
                return {
                    res,
                    newPos: ctx.sourceManager.pos,
                    symbolEffects: ctx.symbolEffectJournal.subJournalFrom(symbolStart),
                    instructionsDelta: ctx.productionEffectJournal.subJournalFrom(productionStart)
                }
            })
        } finally {
            ctx.symbolEffectJournal.stopRecording()
        }
    }

    private replay(fragment: Fragment<T>): Result {
        if (fragment.res !== Result.NotParsed) {
            this.ctx.symbolEffectJournal.replay(fragment.symbolEffects)
            this.ctx.productionEffectJournal.append(...fragment.instructionsDelta)
            this.ctx.sourceManager.pos = fragment.newPos
        }
        return fragment.res
    }
}
```

Le handle(body) interne à attempt() conserve le contrôle existant de neutralité de Continue et nettoie les échecs. Le probe() externe annule aussi les essais réussis. Les fragments sont copiés avant cette annulation ; les objets effets sont ensuite traités comme immuables.

## Raccorder les classes existantes

Dans Context.ts, importer et initialiser le handler comme les autres composants. Ces lignes sont des ajouts à la classe et à son constructeur existants :

```ts
import SeedGrowingHandler from './handler/SeedGrowingHandler.ts'

// Dans la classe Context<T> :
readonly seedGrowingHandler: SeedGrowingHandler<T>

// Dans son constructeur :
this.seedGrowingHandler = new SeedGrowingHandler<T>(this)
```

Dans Expression.ts, supprimer le compteur, le type Seed inutilisé et la table statique. Remplacer parse() par :

```ts
parse(ctx: Context<T>): Result {
    return ctx.seedGrowingHandler.handle(
        this, ctx => this.ref.parse(ctx)
    )
}
```

Au tout début de MemoizerHandler.handle(), avant toute recherche ou ouverture d'enregistrement :

```ts
if (this._ctx.seedGrowingHandler.isActive)
    return lambda(this._ctx)
```

Ce test doit éviter à la fois la consultation et l'écriture du cache, ainsi que sa purge pendant les essais. Il est local au Context : aucune option globale de mémoïsation n'est changée. Hors de cette portée, le chemin actuel du MemoizerHandler continue à fonctionner.

## Exemple avec une production gauche associative

```ts
import { Context, Result, expression, choice, sequence, wordIs, repeat, charIn } from './js-parsec/index.ts'

const n = repeat(charIn<number>('0123456789')).productT<number>(Number)
const E = expression<number>('E')

// E <- E "-" n / n
E.ref = choice(
    sequence(E, wordIs<number>('-'), n)
        .productNT<number>((left, right) => left - right),
    n
)

const ctx = new Context<number>('9-3-2')
if (E.parse(ctx) === Result.Parsed) {
    E.build(ctx)
    console.log(ctx.productionManager.result) // 4, soit (9 - 3) - 2
}
```

Les seeds consomment successivement 9, 9-3, puis 9-3-2. Le dernier essai ne progresse plus ; son fragment est abandonné. Les callbacks productT/productNT sont exécutés uniquement au build(), pour les effets retenus. La grammaire utilise E "-" n pour exprimer cette associativité ; E "-" E introduirait une autre structure grammaticale.

## Extension aux cycles indirects

Pour A → B → A, la réévaluation de A doit entraîner celle des autres règles de son cycle. Le suivi doit mémoriser la tête du cycle, les règles impliquées et celles qui restent à réévaluer pendant l'itération courante. Par exemple :

```ts
type Head<T> = {
    rule: Parsem<T>
    involved: Set<Parsem<T>>
    pending: Set<Parsem<T>>
}
```

Ce type est une indication de conception, pas une implémentation de la récursion indirecte. Il faut identifier le cycle dans la pile d'appels, rattacher ses cellules à une même tête, puis coordonner leur réévaluation. Garder le bypass des caches de combinateurs pendant cette phase évite les anciens résultats de branches ; conserver des cellules terminées sans ce suivi pourrait figer prématurément une règle du cycle.

Référence primaire : [Warth, Douglass et Millstein, Packrat Parsers Can Support Left Recursion](https://tinlizzie.org/~awarth/papers/pepm08.pdf), figures 3-4 pour la récursion directe, sections 3.3-3.4 pour les cycles indirects.

## Validation effectuée sur une copie isolée

- Compilation stricte des sources avec tsc --noEmit : réussie.
- 48 tests ciblés : réussis, dont 10 essais propres à cette proposition et les tests existants Expression, productT, productNT et MemoizerHandler.
- Oracle indépendant pour E ← E "+" "a" / "a", sur des chaînes de 1 à 20 termes ; vérification des positions et de l'absence de tokens dupliqués.
- Associativité de 9-3-2 et absence d'exécution des callbacks avant build().
- Réutilisation de la grammaire sur plusieurs Context, capture autour de la règle, rollback d'une extension échouée et rollback par un Choice englobant.
- Neutralité de Continue, arrêt d'un cycle direct sans progression, rejet explicite d'un cycle indirect et nettoyage après une exception.

Il s'agit d'un prototype de correction pour la récursion directe. La suite complète du projet et les performances Packrat n'ont pas été validées pour cette proposition.
