
## Résumé du Projet : Red Tetris

### 1. Stack Technique et Architecture


**Stack globale :** Le projet doit être développé exclusivement en Full Stack JavaScript, bien que TypeScript soit autorisé.



**Modèle :** L'architecture requise est de type Client/Serveur.



**Communication :** Vous devez utiliser HTTP et `socket.io` pour gérer les événements bidirectionnels en temps réel.



**Rôle du Serveur :** Exécuté sous Node.js, il gère la logique de jeu, les joueurs, la distribution des pièces et les mises à jour du "spectre" des adversaires.



**Rôle du Client :** Il s'agit d'une Single Page Application (SPA) s'exécutant dans le navigateur.



**Outils recommandés :** Un framework moderne (React, Vue) pour la vue et Redux pour la gestion d'état.



### 2. Contraintes de Développement Client

* L'utilisation du mot-clé `this` est strictement interdite pour encourager une approche fonctionnelle.


* La seule exception tolérée pour `this` est la création de sous-classes personnalisées de `Error`.


* La logique gérant le plateau et les pièces doit être implémentée à l'aide de fonctions pures.


* La mise en page (layout) doit exclusivement utiliser Grid ou Flexbox.


* L'utilisation de la balise HTML `<TABLE />` est proscrite.


* Les manipulations directes du DOM (ex: jQuery), ainsi que l'utilisation de Canvas ou SVG, sont interdites.



### 3. Contraintes de Développement Serveur

* Le code serveur doit adopter une approche orientée objet utilisant les prototypes.


* Vous devez définir au minimum les classes suivantes : `Player`, `Piece`, et `Game`.


* Le serveur doit également servir les fichiers statiques (index.html, bundle.js) via HTTP.



### 4. Règles du Jeu (Gameplay)


**Plateau :** Chaque joueur dispose d'une grille de 10 colonnes sur 20 lignes.



**Mécanique :** Le jeu utilise les pièces Tetrimino originales avec leurs règles de rotation.



**Ajustement de collision :** Lorsqu'une pièce touche le tas, elle ne se fige qu'à la frame suivante, permettant un dernier ajustement.



**Contrôles :** Flèches Gauche/Droite (déplacement), flèche Haut (rotation), flèche Bas (soft drop) et Barre Espace (hard drop).



**Pénalités multijoueur :** Lorsqu'un joueur efface des lignes, ses adversaires reçoivent $n-1$ lignes de pénalité indestructibles en bas de leur grille.



**Équité :** Tous les joueurs d'une même partie reçoivent la même séquence de pièces.



**Spectre :** L'interface doit afficher en temps réel la hauteur maximale des colonnes des adversaires.



**Victoire :** Aucun système de score n'est requis par défaut ; le dernier joueur en lice remporte la partie.



### 5. Gestion des Parties (Réseau et Routing)


**Format d'URL :** Les joueurs rejoignent une partie via une URL structurée ainsi : `http://<server_name_or_ip>:<port>/<room>/<player_name>`.



**Hôte :** Le premier joueur à rejoindre une salle (room) devient l'hôte et a le pouvoir de lancer ou relancer la partie.



**Passation :** Si l'hôte quitte la partie, un autre joueur présent récupère ce rôle.



**Verrouillage :** Une fois la partie démarrée, aucun nouveau joueur ne peut la rejoindre en cours de route.



**Concurrence :** Le serveur doit supporter plusieurs parties (rooms) jouées simultanément.



### 6. Tests et Sécurité


**Couverture minimale :** Vos tests unitaires doivent couvrir au moins **70%** des instructions (statements), des fonctions et des lignes, ainsi que **50%** des branches d'exécution.



**Sécurité absolue :** Vous ne devez jamais stocker d'identifiants, de clés d'API ou de variables d'environnement sur le dépôt Git.



**Fichier caché :** Utilisez un fichier d'environnement ignoré par Git ; exposer des secrets entraînera l'échec direct du projet.



### 7. Bonus (Optionnels)

* Les fonctionnalités bonus ne seront évaluées que si la partie obligatoire est 100% terminée et fonctionnelle.


* Idées de bonus : Système de score persistant, modes de jeu alternatifs (pièces invisibles, gravité modifiée), ou utilisation de la Programmation Réactive Fonctionnelle (FRP).