// Transfer War player database. Format: "Name|POS|rating|country code".
// POS is GK, DEF, MID or FWD. Ratings are Transfer War's own (not from any game).
// IMPORTANT: only ADD players at the END of a list. Never delete or reorder,
// because each player's id is its position in the list.

export const CURRENT = [
  // Goalkeepers
  "Alisson|GK|89|BR", "Thibaut Courtois|GK|89|BE", "Gianluigi Donnarumma|GK|88|IT", "Marc-André ter Stegen|GK|86|DE",
  "Ederson|GK|86|BR", "Jan Oblak|GK|87|SI", "Mike Maignan|GK|87|FR", "Emiliano Martínez|GK|87|AR",
  "David Raya|GK|86|ES", "Gregor Kobel|GK|86|CH", "Diogo Costa|GK|85|PT", "Unai Simón|GK|84|ES",
  "Yann Sommer|GK|84|CH", "Guglielmo Vicario|GK|84|IT", "Giorgi Mamardashvili|GK|84|GE", "Jordan Pickford|GK|83|EN",
  "André Onana|GK|81|CM", "Bart Verbruggen|GK|82|NL", "Andriy Lunin|GK|82|UA", "Nick Pope|GK|82|EN",
  "Robert Sánchez|GK|80|ES", "Aaron Ramsdale|GK|80|EN", "Maarten Paes|GK|79|ID", "Emil Audero|GK|78|ID",

  // Defenders
  "Virgil van Dijk|DEF|89|NL", "Rúben Dias|DEF|88|PT", "William Saliba|DEF|88|FR", "Antonio Rüdiger|DEF|86|DE",
  "Gabriel Magalhães|DEF|86|BR", "Alessandro Bastoni|DEF|87|IT", "Achraf Hakimi|DEF|88|MA", "Trent Alexander-Arnold|DEF|86|EN",
  "Joško Gvardiol|DEF|86|HR", "Nuno Mendes|DEF|86|PT", "Marquinhos|DEF|86|BR", "Theo Hernández|DEF|84|FR",
  "Alphonso Davies|DEF|84|CA", "Ronald Araújo|DEF|84|UY", "Jules Koundé|DEF|85|FR", "Éder Militão|DEF|84|BR",
  "Pau Cubarsí|DEF|85|ES", "Kim Min-jae|DEF|84|KR", "Federico Dimarco|DEF|85|IT", "Alejandro Grimaldo|DEF|85|ES",
  "Jeremie Frimpong|DEF|84|NL", "Pedro Porro|DEF|84|ES", "Marc Cucurella|DEF|84|ES", "Reece James|DEF|84|EN",
  "Andrew Robertson|DEF|83|SC", "John Stones|DEF|83|EN", "Ibrahima Konaté|DEF|85|FR", "Jonathan Tah|DEF|85|DE",
  "Nico Schlotterbeck|DEF|84|DE", "Pau Torres|DEF|83|ES", "Piero Hincapié|DEF|83|EC", "Jurriën Timber|DEF|84|NL",
  "Ben White|DEF|83|EN", "Willian Pacho|DEF|84|EC", "Gleison Bremer|DEF|85|BR", "Riccardo Calafiori|DEF|83|IT",
  "Micky van de Ven|DEF|84|NL", "Cristian Romero|DEF|85|AR", "Marc Guéhi|DEF|84|EN", "Levi Colwill|DEF|82|EN",
  "Lisandro Martínez|DEF|83|AR", "Matthijs de Ligt|DEF|82|NL", "Dean Huijsen|DEF|84|ES", "Dani Carvajal|DEF|83|ES",
  "Alejandro Balde|DEF|83|ES", "Dayot Upamecano|DEF|83|FR", "Kyle Walker|DEF|81|EN", "Diogo Dalot|DEF|81|PT",
  "Ferland Mendy|DEF|81|FR", "Noussair Mazraoui|DEF|81|MA", "Jay Idzes|DEF|78|ID", "Calvin Verdonk|DEF|76|ID",
  "Mees Hilgers|DEF|76|ID", "Justin Hubner|DEF|74|ID", "Sandy Walsh|DEF|74|ID", "Rizky Ridho|DEF|72|ID",
  "Pratama Arhan|DEF|70|ID", "Elkan Baggott|DEF|70|ID",

  // Midfielders
  "Rodri|MID|90|ES", "Jude Bellingham|MID|90|EN", "Pedri|MID|89|ES", "Florian Wirtz|MID|89|DE",
  "Jamal Musiala|MID|89|DE", "Cole Palmer|MID|88|EN", "Vitinha|MID|88|PT", "Federico Valverde|MID|88|UY",
  "Declan Rice|MID|88|EN", "Martin Ødegaard|MID|87|NO", "Joshua Kimmich|MID|87|DE", "Nicolò Barella|MID|87|IT",
  "Alexis Mac Allister|MID|87|AR", "Kevin De Bruyne|MID|85|BE", "Bruno Fernandes|MID|86|PT", "Frenkie de Jong|MID|86|NL",
  "Hakan Çalhanoğlu|MID|86|TR", "Moisés Caicedo|MID|86|EC", "Bernardo Silva|MID|86|PT", "Bruno Guimarães|MID|86|BR",
  "João Neves|MID|86|PT", "Phil Foden|MID|85|EN", "Aurélien Tchouaméni|MID|85|FR", "Dominik Szoboszlai|MID|85|HU",
  "Enzo Fernández|MID|85|AR", "Dani Olmo|MID|85|ES", "Martín Zubimendi|MID|85|ES", "Tijjani Reijnders|MID|85|NL",
  "Luka Modrić|MID|83|HR", "Eduardo Camavinga|MID|84|FR", "Gavi|MID|84|ES", "Sandro Tonali|MID|84|IT",
  "Xavi Simons|MID|84|NL", "Teun Koopmeiners|MID|83|NL", "Fermín López|MID|83|ES", "Lucas Paquetá|MID|83|BR",
  "Mohammed Kudus|MID|83|GH", "İlkay Gündoğan|MID|82|DE", "Manuel Ugarte|MID|81|UY", "Kobbie Mainoo|MID|81|EN",
  "Mason Mount|MID|80|EN", "Thom Haye|MID|76|ID", "Joey Pelupessy|MID|74|ID", "Nathan Tjoe-A-On|MID|72|ID",
  "Ivar Jenner|MID|71|ID", "Marselino Ferdinan|MID|71|ID", "Witan Sulaeman|MID|71|ID", "Ricky Kambuaya|MID|70|ID",

  // Forwards
  "Kylian Mbappé|FWD|92|FR", "Erling Haaland|FWD|91|NO", "Harry Kane|FWD|90|EN", "Lamine Yamal|FWD|90|ES",
  "Mohamed Salah|FWD|89|EG", "Vinícius Júnior|FWD|89|BR", "Ousmane Dembélé|FWD|89|FR", "Raphinha|FWD|88|BR",
  "Bukayo Saka|FWD|88|EN", "Lautaro Martínez|FWD|88|AR", "Khvicha Kvaratskhelia|FWD|87|GE", "Alexander Isak|FWD|87|SE",
  "Julián Álvarez|FWD|87|AR", "Michael Olise|FWD|87|FR", "Victor Osimhen|FWD|86|NG", "Robert Lewandowski|FWD|85|PL",
  "Viktor Gyökeres|FWD|86|SE", "Luis Díaz|FWD|86|CO", "Lionel Messi|FWD|86|AR", "Rafael Leão|FWD|85|PT",
  "Rodrygo|FWD|85|BR", "Nico Williams|FWD|85|ES", "Marcus Thuram|FWD|85|FR", "Antoine Griezmann|FWD|84|FR",
  "Son Heung-min|FWD|84|KR", "Ollie Watkins|FWD|84|EN", "Cody Gakpo|FWD|84|NL", "Omar Marmoush|FWD|84|EG",
  "Hugo Ekitike|FWD|84|FR", "Cristiano Ronaldo|FWD|83|PT", "Gabriel Martinelli|FWD|83|BR", "Jérémy Doku|FWD|83|BE",
  "Bradley Barcola|FWD|83|FR", "Jonathan David|FWD|83|CA", "Benjamin Šeško|FWD|83|SI", "Anthony Gordon|FWD|83|EN",
  "Dušan Vlahović|FWD|83|RS", "Mateo Retegui|FWD|83|IT", "Kaoru Mitoma|FWD|82|JP", "Takefusa Kubo|FWD|81|JP",
  "Jean-Philippe Mateta|FWD|81|FR", "Randal Kolo Muani|FWD|81|FR", "Rasmus Højlund|FWD|80|DK", "Neymar|FWD|79|BR",
  "Ole Romeny|FWD|74|ID", "Ragnar Oratmangoen|FWD|72|ID", "Rafael Struick|FWD|70|ID", "Egy Maulana Vikri|FWD|70|ID",
];

export const LEGENDS = [
  // Goalkeepers
  "Lev Yashin|GK|93|RU", "Gianluigi Buffon|GK|92|IT", "Manuel Neuer|GK|92|DE", "Iker Casillas|GK|91|ES",
  "Oliver Kahn|GK|90|DE", "Peter Schmeichel|GK|90|DK", "Edwin van der Sar|GK|89|NL", "Petr Čech|GK|89|CZ",
  "Dino Zoff|GK|89|IT", "Gordon Banks|GK|89|EN",

  // Defenders
  "Paolo Maldini|DEF|95|IT", "Franz Beckenbauer|DEF|95|DE", "Franco Baresi|DEF|93|IT", "Sergio Ramos|DEF|92|ES",
  "Fabio Cannavaro|DEF|92|IT", "Alessandro Nesta|DEF|92|IT", "Cafu|DEF|92|BR", "Roberto Carlos|DEF|91|BR",
  "Philipp Lahm|DEF|91|DE", "Bobby Moore|DEF|90|EN", "Carles Puyol|DEF|90|ES", "Lilian Thuram|DEF|90|FR",
  "Javier Zanetti|DEF|90|AR", "Rio Ferdinand|DEF|89|EN", "John Terry|DEF|89|EN", "Marcel Desailly|DEF|89|FR",
  "Fernando Hierro|DEF|89|ES", "Dani Alves|DEF|89|BR", "Nemanja Vidić|DEF|88|RS", "Gerard Piqué|DEF|88|ES",
  "Marcelo|DEF|88|BR", "Ashley Cole|DEF|88|EN",

  // Midfielders
  "Zinedine Zidane|MID|96|FR", "Xavi|MID|93|ES", "Andrés Iniesta|MID|93|ES", "Michel Platini|MID|93|FR",
  "Zico|MID|93|BR", "Andrea Pirlo|MID|92|IT", "Kaká|MID|92|BR", "Lothar Matthäus|MID|92|DE",
  "Steven Gerrard|MID|91|EN", "Luís Figo|MID|91|PT", "Sócrates|MID|91|BR", "Francesco Totti|MID|91|IT",
  "Frank Lampard|MID|90|EN", "Paul Scholes|MID|90|EN", "Patrick Vieira|MID|90|FR", "Frank Rijkaard|MID|90|NL",
  "Pavel Nedvěd|MID|90|CZ", "Michael Laudrup|MID|90|DK", "Toni Kroos|MID|90|DE", "Clarence Seedorf|MID|89|NL",
  "Juan Román Riquelme|MID|89|AR", "Roy Keane|MID|89|IE", "Claude Makélélé|MID|88|FR", "Michael Ballack|MID|88|DE",

  // Forwards
  "Pelé|FWD|98|BR", "Diego Maradona|FWD|97|AR", "Johan Cruyff|FWD|96|NL", "Ronaldo Nazário|FWD|96|BR",
  "Alfredo Di Stéfano|FWD|95|AR", "Ronaldinho|FWD|94|BR", "Ferenc Puskás|FWD|94|HU", "Thierry Henry|FWD|93|FR",
  "Marco van Basten|FWD|93|NL", "Eusébio|FWD|93|PT", "Gerd Müller|FWD|93|DE", "Romário|FWD|92|BR",
  "Roberto Baggio|FWD|92|IT", "Gabriel Batistuta|FWD|91|AR", "Andriy Shevchenko|FWD|91|UA", "Zlatan Ibrahimović|FWD|91|SE",
  "Alessandro Del Piero|FWD|91|IT", "Dennis Bergkamp|FWD|91|NL", "Raúl|FWD|90|ES", "Didier Drogba|FWD|89|CI",
  "Samuel Eto'o|FWD|89|CM", "Wayne Rooney|FWD|89|EN", "George Weah|FWD|89|LR", "Miroslav Klose|FWD|88|DE",
  "Bambang Pamungkas|FWD|76|ID", "Kurniawan Dwi Yulianto|FWD|75|ID",
];
