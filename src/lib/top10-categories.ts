export interface Category {
  id: string;
  label: string;
  group: string;
  prompt: string;
}

export interface CategoryGroup {
  name: string;
  icon: string;
  categories: Category[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Power & Action",
    icon: "swords",
    categories: [
      {
        id: "op-mc",
        label: "Top 10 Overpowered Main Character Anime",
        group: "Power & Action",
        prompt:
          "Top 10 anime where the main character is extremely overpowered from the start or becomes overpowered quickly. Focus on their power levels, iconic moments, and what makes each MC stand out.",
      },
      {
        id: "op-villain",
        label: "Top 10 Overpowered Villain Anime",
        group: "Power & Action",
        prompt:
          "Top 10 anime with the most powerful and terrifying villains. Focus on what makes each villain overpowered, their motives, and their most iconic evil moments.",
      },
      {
        id: "martial-arts",
        label: "Top 10 Martial Arts Anime",
        group: "Power & Action",
        prompt:
          "Top 10 anime that focus on martial arts, hand-to-hand combat, and fighting techniques. Discuss the fighting styles, training arcs, and best fight scenes.",
      },
      {
        id: "tournament",
        label: "Top 10 Tournament Arc Anime",
        group: "Power & Action",
        prompt:
          "Top 10 anime with the best tournament arcs. Focus on the stakes, the battles, the underdog moments, and what makes each tournament memorable.",
      },
      {
        id: "power-system",
        label: "Top 10 Best Power System Anime",
        group: "Power & Action",
        prompt:
          "Top 10 anime with the most creative and well-designed power systems (like Nen, Cursed Energy, Haki, etc). Explain each power system and why it works so well.",
      },
      {
        id: "battle-shonen",
        label: "Top 10 Battle Shonen Anime",
        group: "Power & Action",
        prompt:
          "Top 10 best battle shonen anime of all time. Cover the fights, character growth, iconic moments, and why each one is a must-watch.",
      },
    ],
  },
  {
    name: "Story & Drama",
    icon: "drama",
    categories: [
      {
        id: "romance",
        label: "Top 10 Romance Anime",
        group: "Story & Drama",
        prompt:
          "Top 10 best romance anime that will make you feel all the emotions. Cover the love stories, the chemistry between characters, and the most heartwarming or heartbreaking moments.",
      },
      {
        id: "thriller",
        label: "Top 10 Thriller Anime",
        group: "Story & Drama",
        prompt:
          "Top 10 most thrilling and suspenseful anime. Discuss the plot twists, mind games, tension, and what keeps you on the edge of your seat.",
      },
      {
        id: "psychological",
        label: "Top 10 Psychological Anime",
        group: "Story & Drama",
        prompt:
          "Top 10 anime that mess with your mind. Focus on psychological manipulation, moral dilemmas, unreliable narrators, and mind-bending plot twists.",
      },
      {
        id: "sad",
        label: "Top 10 Saddest Anime That Will Make You Cry",
        group: "Story & Drama",
        prompt:
          "Top 10 anime guaranteed to make you cry. Discuss the emotional storylines, character deaths, sacrifices, and moments that hit the hardest.",
      },
      {
        id: "plot-twist",
        label: "Top 10 Anime With Best Plot Twists",
        group: "Story & Drama",
        prompt:
          "Top 10 anime with the most shocking and unexpected plot twists. Discuss each twist without fully spoiling it, explain why it was so impactful.",
      },
      {
        id: "revenge",
        label: "Top 10 Revenge Anime",
        group: "Story & Drama",
        prompt:
          "Top 10 anime where the MC seeks revenge. Cover their tragic backstory, the journey of vengeance, and the most satisfying revenge moments.",
      },
      {
        id: "betrayal",
        label: "Top 10 Anime With Best Betrayals",
        group: "Story & Drama",
        prompt:
          "Top 10 anime with the most shocking betrayals. Discuss who betrayed whom, why, and how it changed the entire story.",
      },
    ],
  },
  {
    name: "Dark & Mature",
    icon: "skull",
    categories: [
      {
        id: "dark-fantasy",
        label: "Top 10 Dark Fantasy Anime",
        group: "Dark & Mature",
        prompt:
          "Top 10 dark fantasy anime with gritty worlds, morally grey characters, and brutal storylines. Cover the dark themes, world-building, and what makes each one stand out.",
      },
      {
        id: "horror",
        label: "Top 10 Horror Anime",
        group: "Dark & Mature",
        prompt:
          "Top 10 scariest and most disturbing horror anime. Discuss the creepy atmosphere, horror elements, and the scenes that will keep you up at night.",
      },
      {
        id: "gore",
        label: "Top 10 Most Brutal & Gory Anime",
        group: "Dark & Mature",
        prompt:
          "Top 10 anime with the most intense and brutal action/gore. Cover what makes each one intense, the violence level, and why it works for the story.",
      },
      {
        id: "survival",
        label: "Top 10 Survival Game Anime",
        group: "Dark & Mature",
        prompt:
          "Top 10 anime where characters are forced into deadly survival games. Discuss the rules, the stakes, the strategies, and the most intense moments.",
      },
      {
        id: "villain-mc",
        label: "Top 10 Anime Where MC is the Villain",
        group: "Dark & Mature",
        prompt:
          "Top 10 anime where the main character is actually the villain or an anti-hero. Discuss their morality, dark actions, and why viewers still root for them.",
      },
    ],
  },
  {
    name: "Genre Specific",
    icon: "layers",
    categories: [
      {
        id: "isekai",
        label: "Top 10 Isekai Anime",
        group: "Genre Specific",
        prompt:
          "Top 10 best isekai anime where the MC is transported to another world. Cover the unique worlds, power systems, and what sets each isekai apart.",
      },
      {
        id: "mecha",
        label: "Top 10 Mecha Anime",
        group: "Genre Specific",
        prompt:
          "Top 10 best mecha/robot anime of all time. Discuss the mechs, the pilots, the battles, and the stories behind the machines.",
      },
      {
        id: "sports",
        label: "Top 10 Sports Anime",
        group: "Genre Specific",
        prompt:
          "Top 10 best sports anime that will get you hyped. Cover the sports, the rivalries, the training montages, and the championship moments.",
      },
      {
        id: "comedy",
        label: "Top 10 Funniest Anime",
        group: "Genre Specific",
        prompt:
          "Top 10 funniest anime that will make you laugh out loud. Discuss the humor style, the funniest characters, and the most hilarious scenes.",
      },
      {
        id: "slice-of-life",
        label: "Top 10 Slice of Life Anime",
        group: "Genre Specific",
        prompt:
          "Top 10 best slice of life anime for a chill, relaxing watch. Discuss the wholesome moments, relatable characters, and the peaceful vibes.",
      },
      {
        id: "sci-fi",
        label: "Top 10 Sci-Fi Anime",
        group: "Genre Specific",
        prompt:
          "Top 10 best science fiction anime. Cover the futuristic concepts, technology, space exploration, AI themes, and mind-bending sci-fi stories.",
      },
      {
        id: "music",
        label: "Top 10 Music Anime",
        group: "Genre Specific",
        prompt:
          "Top 10 anime centered around music, bands, or musical performances. Discuss the soundtracks, the passion for music, and the performances that gave chills.",
      },
    ],
  },
  {
    name: "Characters & Legacy",
    icon: "users",
    categories: [
      {
        id: "best-mc",
        label: "Top 10 Best Main Characters in Anime",
        group: "Characters & Legacy",
        prompt:
          "Top 10 greatest anime main characters of all time. Discuss their personality, growth, iconic moments, and what makes them unforgettable.",
      },
      {
        id: "best-waifu",
        label: "Top 10 Best Waifu in Anime",
        group: "Characters & Legacy",
        prompt:
          "Top 10 most popular and beloved female anime characters (waifus). Discuss their personality, what makes them stand out, and why fans love them.",
      },
      {
        id: "best-villain",
        label: "Top 10 Best Anime Villains of All Time",
        group: "Characters & Legacy",
        prompt:
          "Top 10 greatest anime villains ever. Discuss their plans, their charisma, their dark moments, and what makes a truly great villain.",
      },
      {
        id: "character-development",
        label: "Top 10 Best Character Development in Anime",
        group: "Characters & Legacy",
        prompt:
          "Top 10 anime characters with the most incredible character development. Discuss how they changed from start to finish and the key moments of their transformation.",
      },
      {
        id: "underrated",
        label: "Top 10 Most Underrated Anime",
        group: "Characters & Legacy",
        prompt:
          "Top 10 underrated anime that deserve way more attention. Discuss why each one is a hidden gem and what makes it worth watching.",
      },
      {
        id: "best-anime-all-time",
        label: "Top 10 Best Anime of All Time",
        group: "Characters & Legacy",
        prompt:
          "Top 10 greatest anime of all time. Cover the story, animation, impact on the industry, and why each one is considered a masterpiece.",
      },
      {
        id: "anime-fights",
        label: "Top 10 Best Anime Fights of All Time",
        group: "Characters & Legacy",
        prompt:
          "Top 10 most epic anime fights in history. Describe the combatants, the stakes, the animation quality, and what made each fight legendary.",
      },
    ],
  },
  {
    name: "Manhwa & Manga Specific",
    icon: "book",
    categories: [
      {
        id: "manhwa-op-mc",
        label: "Top 10 Manhwa With Overpowered MC",
        group: "Manhwa & Manga Specific",
        prompt:
          "Top 10 manhwa/webtoons where the main character is ridiculously overpowered. Discuss their powers, the art style, and the best action moments.",
      },
      {
        id: "manhwa-romance",
        label: "Top 10 Romance Manhwa",
        group: "Manhwa & Manga Specific",
        prompt:
          "Top 10 best romance manhwa/webtoons with beautiful art and compelling love stories. Discuss the couples, the drama, and the emotional moments.",
      },
      {
        id: "manhwa-action",
        label: "Top 10 Action Manhwa",
        group: "Manhwa & Manga Specific",
        prompt:
          "Top 10 best action manhwa/webtoons with incredible fight scenes and art. Discuss the power systems, the MC, and the best battle moments.",
      },
      {
        id: "manga-masterpiece",
        label: "Top 10 Manga Masterpieces You Must Read",
        group: "Manhwa & Manga Specific",
        prompt:
          "Top 10 manga that are considered absolute masterpieces. Discuss the storytelling, art, character depth, and why every manga reader should experience them.",
      },
      {
        id: "solo-leveling-like",
        label: "Top 10 Manhwa Like Solo Leveling",
        group: "Manhwa & Manga Specific",
        prompt:
          "Top 10 manhwa similar to Solo Leveling with leveling systems, dungeons, OP main characters, and incredible art. Discuss what makes each one a must-read for Solo Leveling fans.",
      },
    ],
  },
];

export function getAllCategories(): Category[] {
  return CATEGORY_GROUPS.flatMap((group) => group.categories);
}

export function getCategoryById(id: string): Category | undefined {
  return getAllCategories().find((c) => c.id === id);
}
