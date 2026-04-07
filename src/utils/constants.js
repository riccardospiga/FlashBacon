export const EMOJIS = ['📚','🔬','🧮','🌍','🎨','📖','🧬','⚗️','🏛️','🎵','🖥️','🌿','📐','🔭','🧠','💡','⚙️','🌊','🦅','🏆']

export const PROVIDERS_DEF = {
  anthropic: { name: 'Claude (Anthropic)', models: ['claude-opus-4-5','claude-sonnet-4-5','claude-haiku-4-5'] },
  openai:    { name: 'OpenAI / GPT',       models: ['gpt-4o','gpt-4o-mini','o1','o1-mini'] },
  google:    { name: 'Google Gemini',      models: ['gemini-1.5-flash-latest','gemini-1.5-pro-latest','gemini-2.0-flash'] },
  mistral:   { name: 'Mistral AI',         models: ['mistral-large-latest','mistral-small-latest','pixtral-large-latest'] },
  deepseek:  { name: 'DeepSeek',           models: ['deepseek-chat','deepseek-reasoner'] },
}

export const ONB = [
  { icon:'⚡', title:'Benvenuto in FlashBacon!', desc:"La tua app di studio potenziata dall'AI. Trasforma appunti in riassunti, quiz e flashcard." },
  { icon:'📁', title:'Carica le tue fonti',       desc:'Foto, PDF, Word, testo incollato o link. FlashBacon legge tutto e lo passa all\'AI.' },
  { icon:'⚡', title:'Strumenti AI',               desc:'Riassunti, quiz, flashcard 3D, mappe — basati solo sui tuoi materiali.' },
  { icon:'💬', title:'Chat intelligente',          desc:'Fai domande sulle tue fonti. Personalizza lo stile di risposta dell\'AI.' },
  { icon:'📅', title:'Ripasso automatico',         desc:'Pianifica sessioni e ricevi notifiche. Un click avvia il quiz direttamente.' },
]

export const EXT_ICON = {
  pdf:'📄', doc:'📝', docx:'📝', ppt:'📊', pptx:'📊',
  xls:'📈', xlsx:'📈', txt:'📃', csv:'📃', url:'🔗', text:'✏️',
}

export const SUBJ = {
  '📚': { bg:'rgba(108,99,255,.15)', fg:'#A78BFA' },
  '🔬': { bg:'rgba(22,163,74,.15)',  fg:'#4ADE80' },
  '🧮': { bg:'rgba(234,88,12,.15)',  fg:'#FB923C' },
  '🌍': { bg:'rgba(2,132,199,.15)',  fg:'#38BDF8' },
  '🎨': { bg:'rgba(162,28,175,.15)', fg:'#E879F9' },
  '📖': { bg:'rgba(225,29,72,.15)',  fg:'#FB7185' },
  '🧬': { bg:'rgba(21,128,61,.15)',  fg:'#4ADE80' },
  '⚗️': { bg:'rgba(217,119,6,.15)',  fg:'#FBBF24' },
  '🏛️': { bg:'rgba(71,85,105,.15)',  fg:'#94A3B8' },
  '🎵': { bg:'rgba(147,51,234,.15)', fg:'#C084FC' },
  '🖥️': { bg:'rgba(37,99,235,.15)',  fg:'#60A5FA' },
  '🌿': { bg:'rgba(22,163,74,.15)',  fg:'#4ADE80' },
  '📐': { bg:'rgba(194,65,12,.15)',  fg:'#FB923C' },
  '🔭': { bg:'rgba(29,78,216,.15)',  fg:'#60A5FA' },
  '🧠': { bg:'rgba(124,58,237,.15)', fg:'#C084FC' },
  '💡': { bg:'rgba(202,138,4,.15)',  fg:'#FBBF24' },
  '⚙️': { bg:'rgba(71,85,105,.15)',  fg:'#94A3B8' },
  '🌊': { bg:'rgba(3,105,161,.15)',  fg:'#38BDF8' },
  '🦅': { bg:'rgba(180,83,9,.15)',   fg:'#FBBF24' },
  '🏆': { bg:'rgba(180,83,9,.15)',   fg:'#FBBF24' },
}
