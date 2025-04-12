# GoofyGame
Librairie Javascript de chargement/déchargement dynamique du DOM et des scripts

## Exemple d'utilisation
```js
const gg = new GoofyGame(''); // Chaine de caractère vide pour ne pas définir d'accesseur global
await gg.load('https://example.com/'); // Charger une page en mémoire
await gg.apply(); // Afficher la page dans le body
setTimeout(() => {
  await gg.load('https://www.iana.org/help/example-domains'); // Charger une autre page en mémoire (l'ancienne reste toujours présente)
  await gg.remove(); // Enlever l'ancienne page
  await gg.apply(); // Afficher la nouvelle page
}, 10000);
```
