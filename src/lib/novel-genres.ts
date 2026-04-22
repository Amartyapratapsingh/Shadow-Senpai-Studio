/**
 * Novel/Manhwa genre presets for the Video Creator.
 * Based on popular Chinese/Korean drama manhwa styles.
 */

export interface NovelGenre {
  id: string;
  label: string;
  emoji: string;
  description: string;
  promptHint: string;
}

export const NOVEL_GENRES: NovelGenre[] = [
  {
    id: "ceo-romance",
    label: "CEO Romance",
    emoji: "💼",
    description: "Rich CEO falls for ordinary girl, secret identity, luxury lifestyle",
    promptHint: "Chinese/Korean CEO romance manhwa style. Rich powerful CEO male lead, ordinary but strong female lead, luxury settings, dramatic misunderstandings, secret identities, corporate power struggles mixed with love story.",
  },
  {
    id: "revenge-romance",
    label: "Revenge Romance",
    emoji: "🔥",
    description: "Betrayed protagonist returns powerful, ex regrets everything",
    promptHint: "Revenge romance manhwa style. The protagonist was betrayed/humiliated by their partner, disappears, returns years later extremely powerful/wealthy/successful. The ex deeply regrets. Dramatic confrontations and sweet revenge moments.",
  },
  {
    id: "contract-marriage",
    label: "Contract Marriage",
    emoji: "💍",
    description: "Fake marriage turns real, cold husband warms up, hidden feelings",
    promptHint: "Contract/fake marriage romance manhwa style. Two people enter a business arrangement marriage. The cold/distant partner slowly falls in love. Hidden feelings, jealousy moments, dramatic reveals.",
  },
  {
    id: "hidden-identity",
    label: "Hidden Identity",
    emoji: "🎭",
    description: "MC hides true power/wealth, everyone looks down on them, big reveal",
    promptHint: "Hidden identity manhwa style. The main character hides their true identity (secret billionaire, hidden master, royal blood). Everyone disrespects them. Dramatic face-slapping moments when truth is revealed.",
  },
  {
    id: "betrayal-drama",
    label: "Betrayal & Comeback",
    emoji: "💔",
    description: "Loyal partner gets cheated/used, leaves, returns as a changed person",
    promptHint: "Betrayal drama manhwa style. A loyal and devoted partner discovers they were being used/cheated on. They leave heartbroken but return transformed — stronger, richer, more confident. The betrayer is filled with regret.",
  },
  {
    id: "cultivation-romance",
    label: "Cultivation Romance",
    emoji: "⚔️",
    description: "Martial arts world, cultivation powers, forbidden love across realms",
    promptHint: "Chinese cultivation/xianxia romance style. Martial arts, spiritual cultivation, forbidden love between different sects/realms, power-ups, beautiful ancient Chinese fantasy settings.",
  },
  {
    id: "reincarnation",
    label: "Reincarnation / Second Chance",
    emoji: "🔄",
    description: "MC dies and reborn, uses future knowledge to change fate and love",
    promptHint: "Reincarnation/rebirth manhwa style. The protagonist dies tragically, goes back in time or reincarnates. Uses knowledge of the future to avoid past mistakes, protect loved ones, take revenge on enemies, and find true love.",
  },
  {
    id: "cold-male-lead",
    label: "Cold Male Lead",
    emoji: "❄️",
    description: "Emotionless powerful man softens only for her, obsessive love",
    promptHint: "Cold male lead romance manhwa. An emotionless, powerful, feared man who has never shown warmth meets the one person who changes him. He becomes obsessively protective and devoted. Sweet gap moe moments.",
  },
  {
    id: "villainess",
    label: "Villainess Reborn",
    emoji: "👑",
    description: "Reborn as the villainess in a novel, changes her fate, wins the prince",
    promptHint: "Villainess rebirth manhwa style. A woman is reborn as the villainess of a novel. She decides to change her fate, avoids the death flags, and ends up winning the heart of the male lead through intelligence and kindness.",
  },
  {
    id: "action-romance",
    label: "Action Romance",
    emoji: "🗡️",
    description: "Fights, powers, battles mixed with intense love story",
    promptHint: "Action romance manhwa style. Intense fight scenes, superpowers or martial arts, combined with a passionate love story. The couple fights side by side. Dramatic battle confessions.",
  },
  {
    id: "school-romance",
    label: "School Romance",
    emoji: "🏫",
    description: "Campus love, first love, school drama, jealousy, sweet moments",
    promptHint: "School/campus romance manhwa style. High school or college setting, first love, sweet innocent romance mixed with drama, jealous rivals, confession scenes, festival episodes.",
  },
  {
    id: "custom",
    label: "Custom Genre",
    emoji: "✨",
    description: "Describe your own genre and style",
    promptHint: "",
  },
];
