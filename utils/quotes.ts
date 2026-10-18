
import { Language } from '../types';

export interface Quote {
  text: string;
  author: string;
}

const QUOTES: Record<Language, Quote[]> = {
  it: [
    { text: "L'intelligenza è la capacità di adattarsi al cambiamento.", author: "Stephen Hawking" },
    { text: "La strategia è l'arte di far sì che il nemico commetta degli errori.", author: "Sun Tzu" },
    { text: "Non si smette di giocare perché si invecchia, ma si invecchia perché si smette di giocare.", author: "George Bernard Shaw" },
    { text: "Il gioco è la forma più alta di ricerca.", author: "Albert Einstein" },
    { text: "La tattica consiste nel sapere cosa fare quando c'è qualcosa da fare; la strategia consiste nel sapere cosa fare quando non c'è nulla da fare.", author: "S. Tartakower" },
    { text: "Vincere non è tutto, ma voler vincere sì.", author: "Vince Lombardi" },
    { text: "Un videogiocatore non muore mai, fa semplicemente respawn.", author: "Proverbio Nerd" },
    { text: "La miglior difesa è un buon attacco.", author: "Proverbio Strategico" },
    { text: "Nel gioco della vita, la strategia è più importante del caso.", author: "Baltasar Gracián" }
  ],
  en: [
    { text: "Intelligence is the ability to adapt to change.", author: "Stephen Hawking" },
    { text: "Strategy is the art of making use of time and space.", author: "Napoleon Bonaparte" },
    { text: "We don't stop playing because we grow old; we grow old because we stop playing.", author: "George Bernard Shaw" },
    { text: "Play is the highest form of research.", author: "Albert Einstein" },
    { text: "Tactics is knowing what to do when there is something to do. Strategy is knowing what to do when there is nothing to do.", author: "S. Tartakower" },
    { text: "Winning isn't everything, but wanting to win is.", author: "Vince Lombardi" },
    { text: "A gamer never dies, they just respawn.", author: "Nerd Proverb" },
    { text: "The best defense is a good offense.", author: "Strategic Proverb" },
    { text: "In the game of life, strategy is more important than luck.", author: "Baltasar Gracián" }
  ],
  fr: [
    { text: "L'intelligence est la capacité de s'adapter au changement.", author: "Stephen Hawking" },
    { text: "La stratégie est l'art de faire commettre des fautes à l'ennemi.", author: "Sun Tzu" },
    { text: "On ne s'arrête pas de jouer parce qu'on devient vieux ; on devient vieux parce qu'on s'arrête de jouer.", author: "George Bernard Shaw" },
    { text: "Le jeu est la forme la plus élevée de la recherche.", author: "Albert Einstein" },
    { text: "La tactique, c'est savoir quoi faire quand il y a quelque chose à faire ; la stratégie, c'est savoir quoi faire quand il n'y a rien à faire.", author: "S. Tartakower" },
    { text: "Gagner n'est pas tout, mais vouloir gagner l'est.", author: "Vince Lombardi" },
    { text: "Un joueur ne meurt jamais, il respawn simplement.", author: "Proverbe Nerd" },
    { text: "La meilleure défense, c'est l'attaque.", author: "Proverbe Stratégique" },
    { text: "Dans le jeu de la vie, la stratégie est plus importante que la chance.", author: "Baltasar Gracián" }
  ],
  de: [
    { text: "Intelligenz ist die Fähigkeit, sich dem Wandel anzupassen.", author: "Stephen Hawking" },
    { text: "Strategie ist die Kunst, Zeit und Raum zu nutzen.", author: "Napoleon Bonaparte" },
    { text: "Wir hören nicht auf zu spielen, weil wir alt werden; wir werden alt, weil wir aufhören zu spielen.", author: "George Bernard Shaw" },
    { text: "Das Spiel ist die höchste Form der Forschung.", author: "Albert Einstein" },
    { text: "Taktik ist zu wissen, was zu tun ist, wenn es etwas zu tun gibt. Strategie ist zu wissen, was zu tun ist, wenn es nichts zu tun gibt.", author: "S. Tartakower" },
    { text: "Gewinnen ist nicht alles, aber gewinnen zu wollen schon.", author: "Vince Lombardi" },
    { text: "Ein Gamer stirbt nie, er respawnt nur.", author: "Nerd-Sprichwort" },
    { text: "Angriff ist die beste Verteidigung.", author: "Strategisches Sprichwort" },
    { text: "Im Spiel des Lebens ist Strategie wichtiger als Glück.", author: "Baltasar Gracián" }
  ],
  es: [
    { text: "La inteligencia es la capacidad de adaptarse al cambio.", author: "Stephen Hawking" },
    { text: "La estrategia es el arte de hacer que el enemigo cometa errores.", author: "Sun Tzu" },
    { text: "No dejamos de jugar porque envejecemos; envejecemos porque dejamos de jugar.", author: "George Bernard Shaw" },
    { text: "El juego es la forma más elevada de investigación.", author: "Albert Einstein" },
    { text: "La táctica consiste en saber qué hacer cuando hay algo que hacer; la estrategia consiste en saber qué hacer cuando no hay nada que hacer.", author: "S. Tartakower" },
    { text: "Ganar no lo es todo, pero querer ganar sí lo es.", author: "Vince Lombardi" },
    { text: "Un jugador nunca muere, solo respawnea.", author: "Proverbio Nerd" },
    { text: "La mejor defensa es un buen ataque.", author: "Proverbio Estratégico" },
    { text: "En el juego de la vida, la estrategia es más importante que la suerte.", author: "Baltasar Gracián" }
  ]
};

export const getRandomQuote = (language: Language = 'it'): Quote => {
  const list = QUOTES[language] || QUOTES['en'];
  return list[Math.floor(Math.random() * list.length)];
};
