# Tests de js-parsec

`npm test` utilise `node:test` sur les sources TypeScript. `npm run build`
compile la bibliothèque ; les tests ne font pas partie de cette compilation.

Les tests actifs utilisent les managers de `Context` pour lire la source, les
tokens, captures et productions. `runtime/Managers.test.ts` vérifie les quatre
accesseurs publics et le refus d’un résultat sur une source incomplète.

Les deux fichiers Packrat ci-dessous sont actuellement archivés avec le suffixe
`.old` et ne sont pas exécutés par `npm test`. `Utils.handlePackrat` reste un
passage direct au callback ; les résultats de diagnostic qui suivent décrivent
l’ancienne implémentation du cache.

`PEGInvariants.test.ts` conserve les contrats du moteur actuel.
`PackratInvariants.test.ts` vérifie les contrats Packrat décrits dans
[peg-to-packrat.md](../peg-to-packrat.md), sans implémenter ni simuler un cache.
`runtime/PackratMemo.test.ts` utilise directement `Context.getMemo`,
`Context.setMemo` et `Utils.handlePackrat`, avec leur API du commit `100107a` :
les clés sont des instances de parseur, et `setMemo` reçoit séparément le
statut et la position finale.

Le cache est maintenant actif dans `Choice`, `Optional` et `Repeat`.
Les 17 tests de table et de helper passent : identités, positions, trois
statuts, hits sans nouvel appel du callback, contextes distincts, exceptions,
entrées corrompues, rollback et neutralité des accès sur les captures.

Les 33 invariants de parsing sont des contrats actifs : 17 passent et 16
échouent actuellement. Quatorze échecs exposent la perte de tokens, de
captures ou de valeurs après un cache hit, ou la collision entre `Optional`
et `Repeat` partageant un enfant. Les deux autres demandent un diagnostic
de cycle sans progression ; `handleSeedGrowing` est encore préparatoire.

Deux tests comparent une règle partagée avec une grammaire équivalente utilisant
des instances distinctes. Sur `ac`, le succès partagé perd la valeur et le
token `a`. Sur `aa`, une répétition reprenant l'entrée de l'optionnel réussit
à tort. Les assertions vérifient statut, position, pile et tokens, sans
désactiver ni simuler le cache.

Les compteurs observent les évaluations réelles du corps des règles, par
contexte et position. Les règles testées passent par `choice(rule)` ou
`optional(rule)` pour solliciter les points de mémoïsation existants tout en
préservant leur statut. Ils vérifient `Parsed`, `NotParsed`, `Continue`, EOF et
la conservation du cache après retour arrière. La grammaire récursive
`R = 'a' R 'b' | 'a' R 'c' | 'd'`, sur `aⁿe`, exige au plus `n + 1`
évaluations de `R`, pour trois tailles d'entrée. Les cycles directs et
indirects ont une garde de test de 32 évaluations : atteindre cette garde
échoue, sans provoquer de dépassement de pile.

Les autres cas contrôlent l'identité des règles, les offsets, les contextes
distincts, une nouvelle référence de grammaire entre deux contextes, la pile
sémantique, les captures, les valeurs particulières, les arguments rest ou
sans argument, les objets, les closures et les exceptions. Le comportement
actuel de `Choice` et des productions sur `Continue` reste préservé.

`parseUnderTest` utilise l'entrée publique `parser.parse(ctx)`. Le cache
doit conserver les effets observables d'une reconnaissance dans le contexte
courant, pas seulement sa position finale. La table ne doit pas confondre
la reconnaissance d'un enfant et celle de sa répétition complète.

Pour exécuter uniquement les tests de table et de helper :

```powershell
npm.cmd test -- tests/runtime/PackratMemo.test.ts
```

Cette suite ne prouve pas la complexité linéaire de tous les combinators.
Les consultations des continuations de répétition, la durée de vie des
cellules en cours et la mutation de grammaire pendant une session exigent
encore une API du moteur. Le contrat des actions différées et les tests
d'intégration des consommateurs restent à définir avec ce mode.
