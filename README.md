# Quizzap

> Une application quizz simple et efficace.

**Créateur de quizz · Gestionnaire de quizz · Importeur de quizz · Joueur de quizz**  
Développé entièrement en HTML/CSS/JS - sans framework, sans moteur.

[▶ Essayer en ligne](https://skylepaf.github.io/Quizzap/web_browser/index.html)

*Les données seront enregistrées dans le local storage du navigateur.*

---

## Screenshots

| Créateur de quizz | Joueur de quizz |
|---|---|
| ![maker](screenshots/quizz_maker.png) | ![player](screenshots/quizz_player.png) |

| Gestionnaire de quizz | Importeur de quizz |
|---|---|
| ![manager](screenshots/quizz_manager.png) | ![importer](screenshots/quizz_importer.png) |

---

## Contenu

- **Créateur de quizz** — 3 types de questions possibles, simple d'utilisation et intuitif, enregistrement en 1 fichier à partager
- **Gestionnaire de quizz** — modification, suppression de quizz
- **Importeur de quizz** — possibilité d'importer un fichier quizz (.json)
- **Joueur de quizz** — jouer n'importe quel quizz avec un temps imparti et un score de fin

---

## Architecture

Aucun moteur. Aucun framework. Entièrement conçu from scratch:

```
├── assets/
├── scenes/
│   ├── QuizzBrowser/
│   │   ├── index.js          # lecture du fichier json importé et extraction des données
│   │   ├── QuizzBrowser.html # affichage dynamique adapté au nombre de quizz
│   │   └── style.css         # style original dark et élégant
│   ├── QuizzCreator/
│   │   ├── index.js          # sauvegarde dans un fichier json avec un ID et une structure définie
│   │   ├── QuizzCreator.html # structure en arbre : div, footer, section -> autres divs -> ...
│   │   └── style.css         # style original dark et élégant
│   ├── QuizzManager/
│   │   ├── index.js
│   │   ├── QuizzManager.html # affichage dynamique adapté au nombre de quizz
│   │   └── style.css         # style original dark et élégant
│   └── QuizzPlayer/
│       ├── index.js          # calcul de score complet
│       ├── QuizzPlayer.html  # structure générique adaptée à tout type de questions
│       └── style.css         # style original dark et élégant
├── index.html                # menu principal menant vers toutes les fonctionnalités
└── styles.css                # style original dark et élégant
```

L'HTML contient une structure simple et courte `<div>`, `<section>`... Les scripts gèrent le reste dynamiquement et les fichiers de style ordonnent la page.

Les quizz sont 100% gérés en fichiers de données — un quizz se construit de la forme :

```json
{
  "id": "1780757626080hrmhdw9tbn",
  "name": "quizz1",
  "createdAt": "2026-06-06T14:53:46.079Z",
  "modifiedAt": "2026-06-06T14:53:46.079Z",
  "questions": [
    {
      "text": "",
      "type": "multiple",
      "answers": [
        { "text": "", "isCorrect": true },
        { "text": "", "isCorrect": false },
        { "text": "", "isCorrect": false },
        { "text": "", "isCorrect": false }
      ]
    },
    {
      "text": "",
      "type": "vrai/faux",
      "answers": [
        { "text": "Vrai", "isCorrect": true },
        { "text": "Faux", "isCorrect": false }
      ]
    }
  ]
}
```

L'id est généré grâce à une combinaison d'un nombre aléatoire et la date exacte.

---

## À savoir

| Action | Solution |
|--------|----------|
| (Créateur de quizz) Sélectionner la bonne réponse | *Cliquer sur la case de la réponse* |
| (Créateur de quizz) Difficulté à enregistrer | *Vérifier que tous les champs sont remplis et qu'au moins une réponse est définie comme correcte* |

---

## Stack

`HTML` `CSS` `JavaScript` — pas de dépendances, tourne dans n'importe quel navigateur.

Packagé en tant qu'application avec [Electron](https://www.electronjs.org/).  
Pour packager, aller dans `/web_app(Electron)` puis :

```bash
npm install
npm run build
```

*L'exécutable devrait se trouver dans `/web_app(Electron)/dist/`.*

---

## Credits

Code, design and visuals by **SkylePaf**.
*Built in mid 2026.*
