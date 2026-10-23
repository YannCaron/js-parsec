# Tests de js-parsec

`npm test` utilise `node:test` sur les sources TypeScript. `npm run build`
compile la bibliothèque ; les tests ne font pas partie de cette compilation.

~~~powershell
npm.cmd test
npm.cmd test -- tests/DifferentialInvariants.test.ts
npm.cmd test -- tests/runtime/ProductionEffectJournalInvariants.test.ts
npm.cmd test -- tests/runtime/RecognitionStateInvariants.test.ts
~~~

## Rôle de l’oracle

Les tests actifs décrivent les invariants des fonctionnalités existantes. Ils
restent actifs lorsqu’ils révèlent un défaut : perte de `undefined`, arité invalide
acceptée, capture non refermée ou `Continue` avec effets font échouer la suite
jusqu’à correction du moteur.

Les fonctionnalités absentes ont leurs tests complets dans des blocs
`/* FUTURE(...) ... */`. Ces blocs ne sont ni exécutés ni comptés comme tests
ignorés. Retirer le commentaire pour activer un groupe lorsque sa fonctionnalité
devient disponible. Les tests n’injectent ni cache simulé ni adaptateur du moteur.

| Fichier | Contrats |
| --- | --- |
| `PEGInvariants.test.ts` | Choix ordonné, rollback, captures, optionnels, progression des répétitions et productions |
| `PackratInvariants.test.ts` | Reconnaissance mémoïsée, rejeu de la bande, captures et sémantique sélectionnée |
| `runtime/PackratMemo.test.ts` | Table par contexte, identité et offset ; statuts, exceptions, positions corrompues et purge automatique |
| `runtime/MemoizerHandler.test.ts` | Tokens et instructions rejoués après backtracking |
| `runtime/Managers.test.ts` | Managers, journaux d'effets, handlers, isolation et résultat complet |
| `runtime/ProductionEffectJournalInvariants.test.ts` | Valeurs particulières, arités et modèle de pile indépendant |
| `runtime/RecognitionStateInvariants.test.ts` | Neutralité de Continue, rollback et fermeture des captures après exception |
| `DifferentialInvariants.test.ts` | Petites grammaires comparées à un interpréteur indépendant |

Les accès passent par `Context.sourceManager`, `tokenManager`, `symbolManager`, `symbolEffectJournal`,
`productionEffectJournal`, `productionManager`, `memoizerHandler` et
`backtrackingHandler`. La table utilise `search(position, parser)`,
`memoize(position, parser, entry)` et `handle(parser, callback)`, avec les champs
`res`, `newPos`, `symbolEffects` et `instructionsDelta`.

Les tests de hits réutilisent la même instance d’`Optional`, puisque sa clé est
maintenant l’opération elle-même. Un autre test vérifie que deux instances
distinctes gardent des cellules indépendantes pour le même opérande.

## Contrats actifs ajoutés

Une réduction consomme exactement son arité, même avec un argument `undefined`.
Les tests placent cette valeur au début, au milieu, à la fin et parmi des valeurs
falsy, dans la VM et via `ProductNT` avec arité explicite ou paramètres rest.
Les valeurs précédant les arguments restent sur la pile.

Les arités négatives, fractionnaires, `NaN` et infinies doivent produire une erreur
d’arité. L’instruction les refuse avant de consommer la pile ou d’appeler le
producteur. Les arités valides zéro et deux servent de contrôle.

Un `Continue` ne change ni curseur, ni tokens, ni bande, ni pile sémantique, ni
profondeur/contenu des captures. Un parseur personnalisé qui viole ce contrat
doit être signalé. Les tests de rollback préservent aussi les états préexistants.

Une exception de reconnaissance referme les captures ouvertes par `ProductT`,
préserve la capture extérieure et propage la même erreur sans exécuter les
producteurs. Ce contrat n’impose ni rollback complet du curseur ni réutilisation
du contexte après l’erreur.

## Références indépendantes

Le modèle de bande manipule une liste de nombres, sans utiliser
`ProductionManager` ni les effets déclarés des instructions pour établir
l’attendu. Trois graines fixes pilotent chacune 90 ajouts, troncatures ou rejeux.
Les valeurs exécutées et les profondeurs calculées sont comparées au modèle,
y compris depuis un offset intermédiaire. Aucune assertion ne porte sur le temps.

L’interpréteur différentiel utilise `startsWith`, des états locaux indépendants
et une liste d’opérations sémantiques. Il ne consulte ni combinators ni cache.
Il respecte les trois statuts du moteur, notamment le choix qui poursuit après
`Continue`. Dix grammaires sont comparées sur toutes les chaînes de longueur
0 à 4 de l’alphabet `a,b,c,x`, plus des cas Unicode, avec instances partagées puis
distinctes. Les assertions portent sur statut, offset, tokens, bande, valeurs,
ordre des appels et absence d’actions pendant la reconnaissance. Chaque scénario
affiche le premier contre-exemple. Les offsets suivent les unités UTF-16 de JavaScript.

## Contrats futurs en commentaire

- `PackratInvariants.test.ts`, bloc `FUTURE(seed-growing)` : cycles directs/indirects
  sans progression ; croissance productive directe/indirecte de `E = E '+' N | N`
  sur `1+2+3` ; meilleur préfixe sur `1+2+` ; arrêt sur une extension nullable
  sans progrès. Les actions restent différées et seules les instructions de la
  dérivation retenue sont conservées. Des budgets bornent les évaluations si le
  groupe est activé trop tôt.
- `runtime/RecognitionStateInvariants.test.ts`, bloc `FUTURE(purge)` : proposition
  d’API `memoizerHandler.purgeBefore(requestedPosition)`, encore absente. La limite
  effective tient compte du curseur et de tous les points de reprise actifs.
  Les tests protègent les positions courante/futures, les sauvegardes imbriquées,
  les positions dupliquées, la libération après exception et l’isolation des
  contextes. Adapter le nom si une autre entrée publique est retenue.

Les tests actifs de cache exigent déjà sa conservation après un retour arrière.
La future purge doit les respecter. Les compteurs de reconnaissance ne prouvent
pas une complexité linéaire générale.
