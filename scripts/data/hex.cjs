module.exports = {
  it: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">1. La doppia invenzione</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Hex è uno dei rari giochi ad essere stato inventato due volte in modo completamente indipendente da due menti brillanti del Novecento.
          </p>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">Piet Hein (1942):</span> Il matematico, poeta e designer danese lo ideò mentre rifletteva sul celebre "Teorema dei Quattro Colori". Lo chiamò inizialmente <em>Polygon</em> e ne pubblicò le regole sul quotidiano danese <em>Politiken</em>.
            </li>
            <li>
              <span className="text-white block mb-1">John Nash (1948):</span> Anni dopo, il leggendario matematico premio Nobel John Nash (la cui vita è narrata nel film <em>A Beautiful Mind</em>) reinventò il gioco mentre era studente a Princeton. I colleghi lo ribattezzarono familiarmente "Nash" o "John", anche perché veniva giocato sulle piastrelle esagonali dei bagni del campus universitario!
            </li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">2. Perché non esiste il pareggio</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Una delle proprietà matematiche più straordinarie di Hex è che <strong className="text-white">il pareggio è impossibile</strong>. Il matematico David Gale dimostrò che, a tabellone pieno, deve necessariamente esistere un cammino continuo che collega un lato al suo opposto. Questa equivalenza è formalmente collegata al <em>Teorema del Punto Fisso di Brouwer</em> in topologia: se impedisci all'avversario di connettere i suoi due lati, stai contemporaneamente costruendo il tuo cammino vincente!
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">3. Il vantaggio di chi inizia</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            John Nash dimostrò tramite il celebre <strong className="text-white">"Strategy-Stealing Argument"</strong> che il primo giocatore possiede sempre una strategia teorica vincente. Se esistesse una strategia per il secondo giocatore, il primo potrebbe fare una mossa qualsiasi e poi "rubarla", trattando la pedina iniziale come un vantaggio gratuito. Tuttavia, calcolare esplicitamente questa sequenza è un problema <em>PSPACE-completo</em>, rendendo il gioco fresco e insolubile per gli umani.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">4. La "Regola della Torta" (Pie Rule)</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Per bilanciare il vantaggio del primo giocatore nei tornei ufficiali, viene impiegata la cosiddetta "Regola della Torta" (uno taglia, l'altro sceglie): dopo che il primo giocatore ha piazzato la prima pietra, il secondo ha la facoltà di scambiarsi di ruolo e fare sua quella mossa, costringendo il primo a non giocare aperture troppo forti nel centro del rombo.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">5. Curiosità Pop</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Nel 1952 la Parker Brothers commercializzò ufficialmente il gioco battezzandolo <em>HEX</em>. Il celebre divulgatore Martin Gardner gli dedicò ampio spazio nella sua celebre rubrica su <em>Scientific American</em>, consacrandolo tra i giochi matematici più eleganti e venerati della storia.
          </p>
        </div>
      </div>
    )`,
  en: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">1. The Double Invention</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Hex is one of the exceptionally rare board games independently invented twice by two brilliant mathematical minds of the 20th century.
          </p>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">Piet Hein (1942):</span> The Danish mathematician, poet, and designer devised it while meditating on the Four Color Theorem, naming it <em>Polygon</em> and publishing it in the Danish newspaper <em>Politiken</em>.
            </li>
            <li>
              <span className="text-white block mb-1">John Nash (1948):</span> Years later, Nobel Laureate John Nash (depicted in <em>A Beautiful Mind</em>) independently formulated it as a graduate student at Princeton. Fellow students dubbed it "Nash" or "John", frequently playing it on the hexagonal floor tiles of Princeton's Fine Hall bathrooms!
            </li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">2. Why Draws Are Mathematically Impossible</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            One of Hex's most astounding mathematical properties is that <strong className="text-white">a draw is topologically impossible</strong>. David Gale proved that any fully occupied board must contain a continuous connecting path for one of the two players. This proof is formally equivalent to <em>Brouwer's Fixed Point Theorem</em>: blocking your opponent's path invariably creates your own!
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">3. First-Player Advantage &amp; Strategy Stealing</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            John Nash formulated the celebrated <strong className="text-white">Strategy-Stealing Argument</strong>, proving that player 1 must possess a winning strategy. If player 2 had a theoretical win, player 1 could make an arbitrary opening move and adopt player 2's strategy, treating their extra stone as an asset. Because computing the exact winning line is <em>PSPACE-complete</em>, practical games remain fiercely competitive.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">4. The "Pie Rule" (Swap Option)</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            To nullify first-turn bias in championship play, Hex adopts the classic "Pie Rule" (one cuts, the other chooses): after Player 1 places the inaugural stone, Player 2 may either play normally or elect to swap sides and adopt that opening stone, compelling Player 1 to play fair, balanced openers.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">5. Popular Culture &amp; Martin Gardner</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            In 1952, Parker Brothers commercially released the game under the name <em>HEX</em>. Later, Martin Gardner's landmark column in <em>Scientific American</em> catapulted Hex to international renown, cementing it as a timeless pinnacle of mathematical beauty.
          </p>
        </div>
      </div>
    )`,
  es: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">1. La Doble Invención</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Hex es uno de los fascinantes y raros juegos inventados dos veces de manera totalmente independiente por dos genios matemáticos del siglo XX.
          </p>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">Piet Hein (1942):</span> El prolífico matemático, poeta y diseñador danés lo concibió meditando sobre el Teorema de los Cuatro Colores, bautizándolo como <em>Polygon</em> y dándolo a conocer en el diario <em>Politiken</em>.
            </li>
            <li>
              <span className="text-white block mb-1">John Nash (1948):</span> Años más tarde, el célebre premio Nobel John Nash (cuya vida inspiró la película <em>Una mente maravillosa</em>) lo reinventó como estudiante en Princeton. Sus compañeros lo llamaban cariñosamente "Nash" o "John", jugándolo a menudo sobre las baldosas hexagonales de los baños de la universidad.
            </li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">2. Por qué el empate es matemáticamente imposible</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Una de las propiedades más hermosas de Hex es que <strong className="text-white">las tablas o empates no existen</strong>. El matemático David Gale demostró que en cualquier tablero completo siempre existe un camino ininterrumpido que conecta dos lados opuestos. Este hecho equivale formalmente al célebre <em>Teorema del Punto Fijo de Brouwer</em> en topología: bloquear al rival implica forzosamente construir tu propia senda de victoria.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">3. Ventaja del primer jugador y robo de estrategia</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            John Nash demostró mediante el célebre <strong className="text-white">"Argumento del Robo de Estrategia"</strong> que el primer jugador siempre dispone de una victoria teórica asegurada. Si el segundo jugador tuviera una estrategia ganadora, el primero podría colocar una piedra aleatoria y usurparla. No obstante, hallar la secuencia óptima es computacionalmente <em>PSPACE-completo</em>, manteniendo las partidas abiertas y vibrantes.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">4. La "Regla del Pastel" (Pie Rule o Intercambio)</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Para neutralizar la ventaja del jugador que abre en competiciones oficiales, se aplica la conocida regla "uno corta, el otro elige": tras la primera jugada, el segundo jugador tiene derecho a intercambiar bandos y apoderarse de esa primera piedra, obligando a jugar aperturas mesuradas.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">5. Cultura Popular y Martin Gardner</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            En 1952, la juguetera Parker Brothers lanzó el juego comercial bajo el nombre <em>HEX</em>. Poco después, el legendario divulgador Martin Gardner en su columna de <em>Scientific American</em> catapultó Hex a la inmortalidad como una cumbre del pensamiento lógico.
          </p>
        </div>
      </div>
    )`,
  fr: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">1. La Double Invention</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Hex est l'un des rares chefs-d'œuvre à avoir été inventé deux fois indépendamment par deux esprits scientifiques majeurs du XXe siècle.
          </p>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">Piet Hein (1942) :</span> Le mathématicien et poète danois le conçut en réfléchissant au problème des quatre couleurs, sous le nom <em>Polygon</em>, et publia ses règles dans le quotidien danois <em>Politiken</em>.
            </li>
            <li>
              <span className="text-white block mb-1">John Nash (1948) :</span> Quelques années plus tard, le prix Nobel John Nash (héros du film <em>Un homme d'exception</em>) le réinventa à Princeton. Ses condisciples l'appelèrent "Nash", y jouant souvent sur le carrelage hexagonal des salles de bains du campus !
            </li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">2. L'Impossibilité Mathématique du Match Nul</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Hex possède la propriété topologique stupéfiante de <strong className="text-white">ne jamais pouvoir se solder par un nul</strong>. David Gale a prouvé que tout plateau complet relie obligatoirement deux bords opposés, un résultat mathématiquement équivalent au <em>Théorème du point fixe de Brouwer</em>.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">3. Avantage au Premier Joueur et Vol de Stratégie</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            John Nash prouva par l'élégant <strong className="text-white">« Vol de Stratégie »</strong> que le premier joueur possède toujours une stratégie théorique gagnante. Mais déterminer concrètement les coups gagnants est un problème <em>PSPACE-complet</em>, garantissant des duels passionnants pour les joueurs humains.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">4. La Règle du Gâteau (Pie Rule)</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Pour neutraliser l'avantage du trait en tournoi, les joueurs appliquent la règle du gâteau (l'un coupe, l'autre choisit) : après la pose de la première pierre, le second joueur peut décider d'intervertir les couleurs et de récupérer ce coup initial.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">5. Rayonnement et Martin Gardner</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Commercialisé par Parker Brothers en 1952 sous le nom <em>HEX</em>, le jeu devint une légende après les chroniques de Martin Gardner dans <em>Scientific American</em>, l'érigeant au panthéon des jeux de pure logique.
          </p>
        </div>
      </div>
    )`,
  de: `(
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">1. Die Doppelte Erfindung</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed mb-4">
            Hex ist eines der seltenen Spiele, die von zwei mathematischen Genies des 20. Jahrhunderts völlig unabhängig voneinander erfunden wurden.
          </p>
          <ul className="list-disc pl-5 text-sm font-bold text-slate-300 leading-relaxed space-y-4">
            <li>
              <span className="text-white block mb-1">Piet Hein (1942):</span> Der dänische Mathematiker und Dichter entwickelte es inspiriert vom Vier-Farben-Satz unter dem Namen <em>Polygon</em> und stellte es in der Zeitung <em>Politiken</em> vor.
            </li>
            <li>
              <span className="text-white block mb-1">John Nash (1948):</span> Jahre später erfand Nobelpreisträger John Nash (bekannt aus <em>A Beautiful Mind</em>) das Spiel als Doktorand in Princeton neu. Seine Kollegen nannten es „Nash“, da sie es oft auf den sechseckigen Bodenfliesen der Universität spielten!
            </li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">2. Warum ein Unentschieden unmöglich ist</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Zu den faszinierendsten mathematischen Gesetzen von Hex gehört, dass <strong className="text-white">ein Remis topologisch unmöglich ist</strong>. David Gale bewies, dass jedes voll besetzte Brett eine ununterbrochene Siegeskette enthält. Dieser Beweis ist äquivalent zu <em>Brouwers Fixpunktsatz</em>: Wer den Gegner blockiert, baut zeitgleich den eigenen Pfad.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">3. Anzugsvorteil und Strategie-Diebstahl</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            John Nash bewies mit dem berühmten <strong className="text-white">„Strategy-Stealing-Argument“</strong>, dass der Startspieler stets eine mathematische Gewinnstrategie besitzt. Da das Berechnen dieser Züge jedoch <em>PSPACE-vollständig</em> ist, bleiben Partien für Menschen hochgradig komplex und spannend.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">4. Die Kuchenregel (Pie Rule)</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            Um den Anzugsvorteil bei Turnieren auszugleichen, gilt die Kuchenregel („Einer teilt, der andere wählt“): Nach dem ersten Zug darf der zweite Spieler wählen, ob er die Seiten tauschen und diesen ersten Stein übernehmen möchte.
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <h3 className="text-sm font-black text-fuchsia-400 uppercase mb-2 tracking-wider">5. Popkultur und Martin Gardner</h3>
          <p className="text-sm font-bold text-slate-300 leading-relaxed">
            1952 brachte Parker Brothers das Spiel als <em>HEX</em> heraus. Durch Martin Gardners legendäre Kolumne im <em>Scientific American</em> wurde Hex weltberühmt und gilt als Juwel moderner Mathematik.
          </p>
        </div>
      </div>
    )`
};
