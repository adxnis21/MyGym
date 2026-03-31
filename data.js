// ═══════════════════════════════════════════
//   GYMPRO — BASE DE DATOS DE EJERCICIOS
// ═══════════════════════════════════════════

const MUSCLE_GROUPS = [
  "Todos","Pecho","Espalda","Hombros","Bíceps","Tríceps",
  "Piernas","Abdomen",
];

const EXERCISES_DB = [
  // PECHO
  { id:"ex001", name:"Press de banca",       muscle:"Pecho",    icon:"imgPecho/pressbanca.png", secondary:["Tríceps","Hombros"] },
  { id:"ex002", name:"Press inclinado con mancuernas",    muscle:"Pecho",    icon:"imgPecho/pressinclinado.jpg", secondary:["Tríceps"] },
  { id:"ex003", name:"Aperturas en máquina",       muscle:"Pecho",    icon:"imgPecho/pecdeck.jpg", secondary:[] },
  { id:"ex004", name:"Aperturas en polea baja",       muscle:"Pecho",    icon:"imgPecho/aperturas.jpg", secondary:[] },
  // ESPALDA
  { id:"ex020", name:"Dominadas",                muscle:"Espalda",  icon:"imgEspalda/dominada.jpg", secondary:["Bíceps"] },
  { id:"ex021", name:"Jalón al pecho Agarre Cerrado",           muscle:"Espalda",  icon:"imgEspalda/jalonpecho.png", secondary:["Bíceps"] },
  { id:"ex022", name:"Remo sentado con Agarre en V",           muscle:"Espalda",  icon:"imgEspalda/remosentado.jpg", secondary:["Bíceps"] },
  { id:"ex023", name:"Extensión de Espalda",       muscle:"Espalda",  icon:"imgEspalda/espalda.jpg", secondary:["Bíceps"] },
  { id:"ex024", name:"Jalón al pecho abierto",       muscle:"Espalda",  icon:"imgEspalda/jalon.jpg", secondary:["Bíceps"] },
  { id:"ex025", name:"Remo con barra",       muscle:"Espalda",  icon:"imgEspalda/remo barra.png", secondary:["Bíceps"] },
  // HOMBROS
  { id:"ex031", name:"Press militar mancuernas", muscle:"Hombros",  icon:"imgHombro/militar.jpg", secondary:["Tríceps"] },
  { id:"ex032", name:"Elevaciones laterales Polea",    muscle:"Hombros",  icon:"imgHombro/lateral.jpg", secondary:[] },
  { id:"ex033", name:"Vuelos Posteriores en máquina",    muscle:"Hombros",  icon:"imgHombro/posterior.jpg", secondary:[] },
  { id:"ex034", name:"Laterales con mancuerna",    muscle:"Hombros",  icon:"imgHombro/lateralm.png", secondary:[] },
  // BÍCEPS
  { id:"ex040", name:"Curl Bayesian",               muscle:"Bíceps",   icon:"imgBiceps/bayesian.jpg", secondary:[] },
  { id:"ex041", name:"Curl Martillo",          muscle:"Bíceps",   icon:"imgBiceps/martillo.jpg", secondary:[] },
  { id:"ex042", name:"Curl Predicador",          muscle:"Bíceps",   icon:"imgBiceps/predicador.jpg", secondary:[] },
  // TRÍCEPS
  { id:"ex050", name:"Extensión tríceps por encima de la cabeza",  muscle:"Tríceps",  icon:"imgTriceps/cabeza.jpg", secondary:[] },
  { id:"ex051", name:"EXtensión tríceps a un brazo",            muscle:"Tríceps",  icon:"imgTriceps/extension.jpg", secondary:[] },
  // PIERNAS
  { id:"ex060", name:"Sentadilla barra",         muscle:"Piernas",  icon:"imgPierna/sentadilla.png", secondary:["Glúteos"] },
  { id:"ex061", name:"Sentadilla Hack",        muscle:"Piernas",  icon:"imgPierna/hack.jpg", secondary:["Glúteos"] },
  { id:"ex062", name:"Extensión cuádriceps",     muscle:"Piernas",  icon:"imgPierna/extension.jpg", secondary:[] },
  { id:"ex063", name:"Curl femoral tumbado",     muscle:"Piernas",  icon:"imgPierna/tumbado.jpg", secondary:[] },
  { id:"ex064", name:"Gemelos sentado",           muscle:"Piernas",  icon:"imgPierna/gemelo.jpg", secondary:[] },
  { id:"ex065", name:"Peso Muerto Rumano",           muscle:"Piernas",  icon:"imgPierna/rumano.jpg", secondary:[] },
  { id:"ex066", name:"Bulgaras",           muscle:"Piernas",  icon:"imgPierna/bulgara.jpg", secondary:[] },
  // CORE
  { id:"ex090", name:"Crunch abdominal en polea", muscle:"Core",     icon:"imgAbdomen/abdomen.jpg", secondary:[] },
  { id:"ex091", name:"Levantamiento de piernas",  muscle:"Core",     icon:"imgAbdomen/levantamiento.jpg", secondary:[] },
  { id:"ex092", name:"Rueda abdominal",           muscle:"Core",     icon:"imgAbdomen/rueda.jpg", secondary:[] },
  { id:"ex093", name:"Plancha",                   muscle:"Core",     icon:"imgAbdomen/plancha.png", secondary:[] },
];

// Mapa de músculos a regiones del SVG corporal
const MUSCLE_SVG_MAP = {
  "Pecho":    ["chest"],
  "Espalda":  ["upper-back","lower-back"],
  "Hombros":  ["shoulders"],
  "Bíceps":   ["biceps-l","biceps-r"],
  "Tríceps":  ["triceps-l","triceps-r"],
  "Piernas":  ["quads-l","quads-r","calves-l","calves-r","hamstrings-l","hamstrings-r"],
  "Glúteos":  ["glutes"],
  "Core":     ["abs"],
};
