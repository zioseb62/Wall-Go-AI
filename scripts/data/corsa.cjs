module.exports = {
  it: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">1. Invenzione e Origini</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            <span className="text-white">Creatore:</span> Ideato dal designer di giochi italiano <strong className="text-orange-300">Mirko Marchesi</strong> e pubblicato dalla rinomata casa editrice francese <em>Gigamic</em> nel 1997.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            <span className="text-white">Origini e Pinko Pallino:</span> Quoridor è l'evoluzione raffinata di un precedente gioco ideato dallo stesso Marchesi nel 1975, intitolato <em>Pinko Pallino</em> (pubblicato da E.P. Milano), giocato su una scacchiera con barriere mobili e pedine in legno.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">2. Storia ed evoluzione nel mondo dell'AI</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Quoridor è diventato rapidamente un punto di riferimento per l'intelligenza artificiale e la teoria dei grafi. Nel 1997 ha vinto il prestigioso premio <strong className="text-orange-300">Mensa Select</strong> negli Stati Uniti.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Per i ricercatori universitari, Quoridor rappresenta un banco di prova ideale per gli algoritmi di ricerca del percorso minimo (<em>Shortest Path</em> come A* e Dijkstra), combinati con la teoria min-max: posizionare un muro allunga il cammino dell'avversario ma riduce la propria riserva di barriere per il finale.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">3. Curiosità e regole matematiche interessanti</h3>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">La Regola Sacra del Cammino:</span> È severamente vietato chiudere completamente l'avversario tra i muri: deve sempre esistere almeno un percorso valido verso la meta, anche se tortuoso.
            </li>
            <li>
              <span className="text-white block mb-1">Il Salto della Pedina:</span> Quando due pedine si trovano faccia a faccia senza muri intermedi, è consentito saltare sopra l'avversario, guadagnando una casella di vantaggio cruciale nella corsa.
            </li>
            <li>
              <span className="text-white block mb-1">Mind Sports Olympiad:</span> Dal 2020 Quoridor fa parte delle discipline ufficiali della <em>Mind Sports Olympiad (MSO)</em>, con campioni internazionali che calcolano la parità delle barriere residue come negli scacchi.
            </li>
          </ul>
        </div>
      </div>
    )`,
  en: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">1. Invention and Origins</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            <span className="text-white">Creator:</span> Designed by Italian game inventor <strong className="text-orange-300">Mirko Marchesi</strong> and published by French publisher <em>Gigamic</em> in 1997.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            <span className="text-white">Pinko Pallino Heritage:</span> Quoridor evolved from Marchesi's 1975 game <em>Pinko Pallino</em> (released by E.P. Milano), which pioneered moving pawn races navigated through modular wooden fence barriers.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">2. History &amp; AI Evolutionary Benchmark</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Awarded the prestigious <strong className="text-orange-300">Mensa Select</strong> honor in 1997, Quoridor quickly became a foundational benchmark in computer science and graph theory.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            For academic AI research, Quoridor provides an ideal testbed balancing dynamic shortest-path computation (A* and Dijkstra search) with game tree min-max evaluation: dropping a wall lengthens enemy distance while depleting scarce endgame resources.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">3. Mathematical Rules &amp; Tournament Trivia</h3>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">The Golden Rule of Passage:</span> It is illegal to completely wall off an opponent; at least one open topological path to the goal row must remain accessible at all times.
            </li>
            <li>
              <span className="text-white block mb-1">Pawn Leaping:</span> When two pawns meet face-to-face with no intervening wall, you may leap over your opponent, gaining a decisive one-square sprint tempo.
            </li>
            <li>
              <span className="text-white block mb-1">Mind Sports Olympiad:</span> Since 2020, Quoridor has featured as an official tournament event at the <em>Mind Sports Olympiad (MSO)</em>.
            </li>
          </ul>
        </div>
      </div>
    )`,
  es: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">1. Invención y Orígenes</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            <span className="text-white">Creador:</span> Diseñado por el prolífico inventor italiano <strong className="text-orange-300">Mirko Marchesi</strong> y publicado por la prestigiosa editorial francesa <em>Gigamic</em> en 1997.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            <span className="text-white">El Legado de Pinko Pallino:</span> Quoridor es la evolución directa y perfeccionada de <em>Pinko Pallino</em>, creado por el propio Marchesi en 1975 (publicado en Milán), donde ya se introducían los peones de madera sorteando muros móviles.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">2. Historia y Revolución en la Inteligencia Artificial</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Galardonado con el ilustre premio <strong className="text-orange-300">Mensa Select</strong> en 1997 en Estados Unidos, Quoridor se convirtió de inmediato en un referente para la ciencia computacional y la teoría de grafos.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Para los investigadores de inteligencia artificial, Quoridor representa el equilibrio perfecto entre algoritmos de búsqueda del camino más corto (como A* y Dijkstra) y árboles de decisión: cada muro colocado alarga la trayectoria rival pero consume un recurso insustituible para el final de partida.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">3. Reglas Matemáticas y Curiosidades</h3>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">La Regla de Oro del Camino Libre:</span> Está estrictamente prohibido encerrar por completo al oponente; siempre debe quedar expedito al menos un camino transitable hacia el lado opuesto.
            </li>
            <li>
              <span className="text-white block mb-1">El Salto del Peón:</span> Cuando dos peones quedan cara a cara sin obstáculos intermedios, está permitido saltar por encima del rival, ganando una casilla vital en la carrera hacia la victoria.
            </li>
            <li>
              <span className="text-white block mb-1">Mind Sports Olympiad:</span> Desde 2020 Quoridor forma parte del programa oficial de la <em>Mind Sports Olympiad (MSO)</em>, congregando a maestros internacionales de la estrategia.
            </li>
          </ul>
        </div>
      </div>
    )`,
  fr: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">1. Invention et Origines</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            <span className="text-white">Créateur :</span> Conçu par l'auteur italien <strong className="text-orange-300">Mirko Marchesi</strong> et édité par la célèbre maison française <em>Gigamic</em> en 1997.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            <span className="text-white">L'Héritage de Pinko Pallino :</span> Quoridor découle de <em>Pinko Pallino</em>, créé par Marchesi en 1975 à Milan, premier jeu à marier course de pions et pose de barrières en bois amovibles.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">2. Révolution dans l'Intelligence Artificielle</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Lauréat du prestigieux prix <strong className="text-orange-300">Mensa Select</strong> en 1997 aux États-Unis, Quoridor est rapidement devenu un cas d'étude universitaire incontournable en théorie des graphes.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Pour les chercheurs en IA, Quoridor est un terrain d'essai idéal combinant la recherche du plus court chemin (algorithmes A* et Dijkstra) et l'évaluation combinatoire min-max : chaque barrière posée allonge le chemin adverse tout en amputant sa propre réserve.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">3. Règles Clés et Faits Notables</h3>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">La Règle d'Or de l'Issue :</span> Il est rigoureusement interdit de bloquer totalement l'adversaire ; au moins un chemin vers la ligne d'arrivée doit impérativement rester ouvert.
            </li>
            <li>
              <span className="text-white block mb-1">Le Saut de Pion :</span> Lorsque deux pions se font face sans mur intermédiaire, il est autorisé de sauter par-dessus le pion adverse pour gagner un temps précieux.
            </li>
            <li>
              <span className="text-white block mb-1">Mind Sports Olympiad :</span> Depuis 2020, Quoridor est une discipline officielle disputée aux <em>Mind Sports Olympiad (MSO)</em>.
            </li>
          </ul>
        </div>
      </div>
    )`,
  de: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">1. Erfindung und Ursprünge</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            <span className="text-white">Erfinder:</span> Entwickelt vom italienischen Spieleautor <strong className="text-orange-300">Mirko Marchesi</strong> und 1997 vom französischen Verlag <em>Gigamic</em> veröffentlicht.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            <span className="text-white">Pinko Pallino Wurzeln:</span> Quoridor ist die vollendete Weiterentwicklung von Marchesis Spiel <em>Pinko Pallino</em> aus dem Jahr 1975 (erschienen in Mailand), das erstmals Holzpöppel und mobile Barrieren vereinte.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">2. Meilenstein der KI-Forschung</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Ausgezeichnet mit dem begehrten <strong className="text-orange-300">Mensa Select</strong> Award 1997, wurde Quoridor schnell zum Paradebeispiel in Informatik und Graphentheorie.
          </p>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Für KI-Entwickler verbindet Quoridor optimale Pfadsuche (A*- und Dijkstra-Algorithmen) mit Min-Max-Entscheidungen: Jede platzierte Wand verlängert den gegnerischen Weg, verringert aber das eigene Barrieren-Kontingent.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-orange-400 uppercase mb-2 tracking-wider">3. Mathematische Gesetze und Turniersport</h3>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">Die goldene Weg-Regel:</span> Es ist streng verboten, den Gegner komplett einzumauern; stets muss mindestens ein gangbarer Pfad zur Ziellinie frei bleiben.
            </li>
            <li>
              <span className="text-white block mb-1">Der Pöppel-Sprung:</span> Stehen sich zwei Spielfiguren ohne Trennwand gegenüber, darf man direkt über die gegnerische Figur springen.
            </li>
            <li>
              <span className="text-white block mb-1">Mind Sports Olympiad:</span> Seit 2020 wird Quoridor offiziell bei den <em>Mind Sports Olympiad (MSO)</em> auf Weltmeisterschaftsniveau gespielt.
            </li>
          </ul>
        </div>
      </div>
    )`
};
