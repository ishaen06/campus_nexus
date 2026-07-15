export interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", 
      "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", 
      "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", 
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤫", "🤥", 
      "😐", "😑", "😬", "🫨", "🫠", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", 
      "😵‍💫", "🫥", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", 
      "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃"
    ]
  },
  {
    name: "People",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", 
      "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", 
      "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", 
      "👀", "👁️", "👅", "👄", "👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👩", "🧓", "👴", "👵", 
      "👮", "👷", "💂", "🕵️", "🦸", "🦹", "🧙", "🧚", "🧜", "🧝", "🧞", "💆", "💇", "🚶", "🏃", "🧍", 
      "💃", "🕺", "🕴️"
    ]
  },
  {
    name: "Animals",
    icon: "🐱",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", 
      "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", 
      "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🐙", "🦑", 
      "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", " leopards ", "🦓", "🦍", "🦧", "🐘", 
      "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐐", "🐏", "🐑", "🦙", "🦌", "🐕", "🐈", "🐓", "🦃", "🦚", 
      "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦡", "🦦", "🐿️", "🦔", "🎄", "🌲", "🌳", "🌴", "🌱", 
      "🌿", "☘️", "🍀", "🍁", "🍂", "🍃"
    ]
  },
  {
    name: "Food",
    icon: "🍎",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", 
      "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", 
      "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🥞", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", 
      "🍕", "🥪", "🥙", "🌮", "🌯", "🥗", "🥘", "🍲", "🍜", "🍝", "🍣", "🍤", "🥟", "🍙", "🍚", "🍘", 
      "🍥", "🍡", "🍢", "🍧", "🍨", "🍦", "🍰", "🎂", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", 
      "🥛", "☕", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧋", "🧉", "🧊"
    ]
  },
  {
    name: "Sports",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "🎯", "🎮", "👾", "🎳", 
      "🎨", "🎭", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎻", "♟️", "🧩"
    ]
  },
  {
    name: "Travel",
    icon: "🚗",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", 
      "🛴", "🛹", "🚨", "✈️", "🛫", "🛬", "🚁", "🚀", "🛸", "⛵", "🛥️", "🚢", "⚓", "🚧", "⛽", "🗺️", 
      "🗼", "🗽", "🗻", "🌋", "⛰️", "🏕️", "⛺", "🏠", "🏡", "🏢", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", 
      "🏫", "🏬", "🏭", "🏰", "🏯", "💒", "⛪", "🕌", "🕋", "⛩️", "🏜️", "🏖️", "🏝️", "🌇", "🌅", "🏙️", 
      "🌃", "🌌", "🌉", "🌁", "🎡", "🎢", "🎠"
    ]
  },
  {
    name: "Objects",
    icon: "💡",
    emojis: [
      "⌚", "📱", "📲", "💻", "⌨️", "🖱️", "🖨️", "📷", "📹", "🎥", "📽️", "📻", "📺", "🔋", "🔌", "💡", 
      "🔦", "🕯️", "💵", "🪙", "💳", "💎", "⚖️", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🔩", "⚙️", 
      "🧱", "⛓️", "🧲", "🔫", "💣", "🛡️", "⚔️", "🔑", "🗝️", "💊", "💉", "🌡️", "🩺", "🏷️", "📦", "📪", 
      "📫", "📬", "📜", "📄", "📃", "📊", "📈", "📉", "📅", "📆", "📁", "📂", "💼", "📌", "📍", "📎", 
      "🖇️", "📏", "📐", "📝", "📓", "📕", "📗", "📘", "📙", "📚", "✉️", "📮", "✏️", "✒️", "🖍️", "🔍", 
      "🔎", "🔮", "🧿"
    ]
  },
  {
    name: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "🩹", "❣️", "🔑", "💕", "💞", "💓", 
      "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", 
      "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "☣️", "☢️", 
      "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", 
      "🔀", "🔁", "🔂", "▶️", "⏩", "◀️", "⏪", "🔼", "⏫", "🔽", "⏬", "⏸️", "⏹️", "⏺️", "⏏️", "🎦", 
      "🔆", "🔅", "📶", "📳", "📴", "♀️", "♂️", "⚧️", "✖️", "➕", "➖", "➗", "♾️", "‼️", "⁉️", "❓", 
      "❔", "❕", "❗️", "〰️", "💱", "💲", "⚕️"
    ]
  }
];

export const ALL_EMOJIS: string[] = EMOJI_CATEGORIES.reduce<string[]>((acc, cat) => {
  return [...acc, ...cat.emojis];
}, []);

export const EMOJI_TAGS: Record<string, string[]> = {
  // Smileys & Emotion
  "😀": ["smile", "happy", "face", "grin"],
  "😃": ["smile", "happy", "face", "grin"],
  "😄": ["smile", "happy", "face", "grin"],
  "😁": ["smile", "happy", "face", "grin"],
  "😆": ["smile", "happy", "face", "grin"],
  "😅": ["smile", "happy", "face", "sweat"],
  "😂": ["laugh", "tear", "lol", "funny", "cry"],
  "🤣": ["laugh", "funny", "rofl", "lol"],
  "😊": ["smile", "happy", "blush", "face"],
  "😇": ["angel", "halo", "holy", "smile"],
  "🙂": ["smile", "face"],
  "🙃": ["upside", "down", "flip"],
  "😉": ["wink", "face"],
  "😌": ["relieved", "peace", "calm"],
  "😍": ["love", "heart", "eyes", "like"],
  "🥰": ["love", "hearts", "blush", "happy"],
  "😘": ["kiss", "love", "heart"],
  "😋": ["yummy", "tongue", "delicious", "food"],
  "😛": ["tongue", "face"],
  "😜": ["wink", "tongue", "crazy", "joke"],
  "🤪": ["crazy", "goofy", "wild"],
  "😎": ["cool", "glass", "sunglasses", "chill"],
  "🤩": ["star", "eyes", "excited"],
  "🥳": ["party", "celebrate", "hat", "horn"],
  "😏": ["smirk", "sly", "face"],
  "😒": ["unamused", "bored", "meh"],
  "😞": ["disappointed", "sad", "face"],
  "😔": ["pensive", "sad", "thoughtful"],
  "😟": ["worried", "anxious", "face"],
  "😕": ["confused", "unsure"],
  "🙁": ["frown", "sad"],
  "☹️": ["frown", "sad"],
  "😣": ["struggle", "pain"],
  "😖": ["confounded", "frustrated"],
  "😫": ["tired", "exhausted"],
  "😩": ["weary", "sad", "tired"],
  "🥺": ["pleading", "begging", "sad", "cute"],
  "😢": ["cry", "sad", "tear"],
  "😭": ["cry", "sad", "sob", "tears"],
  "😤": ["triumph", "mad", "steam", "angry"],
  "😠": ["angry", "mad", "face"],
  "😡": ["angry", "mad", "red", "furious"],
  "🤬": ["curse", "swear", "angry", "censored"],
  "🤯": ["explode", "mind", "blown", "wow"],
  "😳": ["flushed", "blush", "shocked"],
  "🥵": ["hot", "sweat", "fever"],
  "🥶": ["cold", "freeze", "ice"],
  "😱": ["scream", "shock", "scared", "fear"],
  "😨": ["fear", "scared"],
  "😰": ["sweat", "scared", "fear"],
  "😥": ["sad", "sweat", "relief"],
  "😓": ["sweat", "sad", "work"],
  "🤗": ["hug", "open", "hands"],
  "🤔": ["think", "hmm", "question", "ponder"],
  "🫣": ["peek", "scared", "hide"],
  "🤭": ["giggle", "secret", "laugh"],
  "🤫": ["shush", "quiet", "silent"],
  "🤥": ["lying", "nose", "pinocchio"],
  "😐": ["neutral", "poker", "face", "meh"],
  "😑": ["expressionless", "flat", "meh"],
  "😬": ["grimace", "awkward", "teeth"],
  "🫨": ["shake", "shook", "vibrate"],
  "🫠": ["melt", "hot", "warm"],
  "🙄": ["roll", "eyes", "bored", "meh"],
  "😴": ["sleep", "tired", "zzz", "snore"],
  "🤤": ["drool", "yummy"],
  "😪": ["sleepy", "sad", "tired"],
  "😵": ["dizzy", "dead", "crossed"],
  "😵‍💫": ["dizzy", "spiral", "confused"],
  "🫥": ["invisible", "dotted", "hide"],
  "🤐": ["zipper", "silent", "secret"],
  "🥴": ["woozy", "drunk", "dizzy"],
  "🤢": ["sick", "green", "vomit", "gross"],
  "🤮": ["vomit", "sick", "throwup"],
  "🤧": ["sneeze", "sick", "cold"],
  "😷": ["mask", "sick", "doctor"],
  "🤒": ["thermometer", "fever", "sick"],
  "🤕": ["bandage", "hurt", "headache"],
  "🤑": ["money", "rich", "cash"],
  "🤠": ["cowboy", "hat", "sheriff"],
  "😈": ["devil", "evil", "purple", "horn"],
  "👿": ["devil", "angry", "purple"],
  "👹": ["ogre", "monster", "red", "mask"],
  "👺": ["goblin", "red", "mask", "nose"],
  "🤡": ["clown", "funny", "circus"],
  "💩": ["poop", "poo", "shit", "funny"],
  "👻": ["ghost", "spooky", "halloween", "scary"],
  "💀": ["skull", "dead", "skeleton", "spooky"],
  "☠️": ["pirate", "dead", "danger", "crossbones"],
  "👽": ["alien", "ufo", "space", "martian"],
  "👾": ["invader", "game", "retro", "pixel"],
  "🤖": ["robot", "bot", "tech", "computer"],
  "🎃": ["pumpkin", "halloween", "jack"],

  // People & Gestures
  "👋": ["wave", "hello", "hi", "bye"],
  "👍": ["thumbs", "up", "like", "yes", "ok"],
  "👎": ["thumbs", "down", "dislike", "no"],
  "✊": ["fist", "punch", "hand"],
  "👊": ["fist", "punch", "hand"],
  "👏": ["clap", "applause", "hand"],
  "🙌": ["celebrate", "hands", "hooray"],
  "🙏": ["pray", "please", "thanks", "thankyou"],
  "💪": ["flex", "muscle", "strong", "power"],
  "🧠": ["brain", "mind", "smart", "think"],
  "👀": ["eyes", "look", "see"],
  
  // Tech & Work
  "💻": ["laptop", "computer", "code", "tech", "work", "developer", "programming"],
  "🚀": ["rocket", "space", "launch", "ship", "fast"],
  "🎓": ["graduation", "cap", "hat", "degree", "college", "university", "study", "student"],
  "🎨": ["paint", "art", "brush", "palette", "design", "creative"],
  "⚽": ["soccer", "ball", "football", "sport"],
  "🏀": ["basketball", "ball", "sport"],
  "🎮": ["game", "controller", "play", "gaming", "xbox", "playstation"],
  "🎧": ["headphones", "music", "audio", "listen", "song"],
  "🎤": ["microphone", "mic", "sing", "music"],
  "🔥": ["fire", "hot", "lit", "burn", "trend"],
  "💡": ["bulb", "idea", "light", "bright", "smart"],
  "❤️": ["heart", "love", "red"]
};

export function searchEmojis(query: string): string[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return ALL_EMOJIS;
  
  // Filter emojis based on query
  return ALL_EMOJIS.filter(emoji => {
    // 1. Exact match
    if (emoji === cleanQuery) return true;
    
    // 2. Search tags
    const tags = EMOJI_TAGS[emoji] || [];
    if (tags.some(tag => tag.includes(cleanQuery))) return true;
    
    // 3. Search category names
    for (const cat of EMOJI_CATEGORIES) {
      if (cat.name.toLowerCase().includes(cleanQuery) && cat.emojis.includes(emoji)) {
        return true;
      }
    }
    
    return false;
  });
}
