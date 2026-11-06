(()=>{
    const PRESETS = {
      // Verified DiceBear Adventurer Hair Values
      hair: [
        { id: 'short01', label: 'Crew Short' },
        { id: 'short02', label: 'Side Part' },
        { id: 'short03', label: 'Tapered Cut' },
        { id: 'short04', label: 'Spike Sweep' },
        { id: 'short05', label: 'Buzz Cut' },
        { id: 'short06', label: 'Caesar Crop' },
        { id: 'short07', label: 'Modern Slick' },
        { id: 'short08', label: 'Wind Fade' },
        { id: 'short09', label: 'Top Knot' },
        { id: 'short10', label: 'Undercut' },
        { id: 'short11', label: 'Fringe Wave' },
        { id: 'short12', label: 'Pixie Shag' },
        { id: 'short13', label: 'Messy Bedhead' },
        { id: 'short14', label: 'Pompadour' },
        { id: 'short15', label: 'Side Sweep' },
        { id: 'short16', label: 'Hawk Crest' },
        { id: 'long01', label: 'Flowing Wave' },
        { id: 'long02', label: 'Elven Lock' },
        { id: 'long03', label: 'Straight Long' },
        { id: 'long04', label: 'Layered Mane' },
        { id: 'long05', label: 'Twin Ponytails' },
        { id: 'long06', label: 'Warrior Half-Up' },
        { id: 'long07', label: 'Cascading Curl' },
        { id: 'long08', label: 'Low Ponytail' },
        { id: 'long09', label: 'Sorcerer Tress' },
        { id: 'long10', label: 'Wild Shaman' },
        { id: 'long11', label: 'Side Plait' },
        { id: 'long12', label: 'Royal Locks' },
        { id: 'long13', label: 'Nomad Strands' },
        { id: 'long14', label: 'Gothic Straight' },
        { id: 'long15', label: 'Bardic Bangs' },
        { id: 'long16', label: 'Ranger Braid' }
      ],
      // Verified Adventurer Hair Colors (Hex without '#')
      hairColors: [
        { hex: '0e0e0e', name: 'Obsidian Black' },
        { hex: '562306', name: 'Espresso Brown' },
        { hex: '6a4e35', name: 'Chestnut Bronze' },
        { hex: '796a45', name: 'Warm Caramel' },
        { hex: 'b9a05f', name: 'Golden Honey' },
        { hex: 'e5d7a3', name: 'Platinum Blonde' },
        { hex: 'ac6511', name: 'Copper Auburn' },
        { hex: 'cb6820', name: 'Amber Glow' },
        { hex: 'ab2a18', name: 'Crimson Flame' },
        { hex: '592454', name: 'Arcane Amethyst' },
        { hex: '85c2c6', name: 'Electric Cyan' },
        { hex: '3eac2c', name: 'Jade Emerald' },
        { hex: 'dba3be', name: 'Rose Quartz' },
        { hex: 'afafaf', name: 'Silver Moon' }
      ],
      // Verified Adventurer Skin Tones (Hex without '#')
      skinColors: [
        { hex: 'f2d3b1', name: 'Pale Fair' },
        { hex: 'ecad80', name: 'Honey Warm' },
        { hex: 'd08b5b', name: 'Golden Tan' },
        { hex: '9e5622', name: 'Bronze Amber' },
        { hex: '763900', name: 'Deep Mocha' },
        { hex: '614335', name: 'Rich Espresso' }
      ],
      // Eyes Variants
      eyes: [
        { id: 'variant01', label: 'Determined' },
        { id: 'variant02', label: 'Sharp Alert' },
        { id: 'variant03', label: 'Radiant Spark' },
        { id: 'variant04', label: 'Calm Sage' },
        { id: 'variant05', label: 'Soft Calm' },
        { id: 'variant06', label: 'Hero Focus' },
        { id: 'variant07', label: 'Wide Curious' },
        { id: 'variant08', label: 'Mystic Chill' },
        { id: 'variant09', label: 'Fierce Gaze' },
        { id: 'variant10', label: 'Wanderer' },
        { id: 'variant11', label: 'Kind Glance' },
        { id: 'variant12', label: 'Watcher' }
      ],
      // Eyebrows Variants
      eyebrows: [
        { id: 'variant01', label: 'Natural Neutral' },
        { id: 'variant02', label: 'High Arch' },
        { id: 'variant03', label: 'Bold Chiseled' },
        { id: 'variant04', label: 'Fierce V' },
        { id: 'variant05', label: 'Gentle Kind' },
        { id: 'variant06', label: 'Inquisitive' },
        { id: 'variant07', label: 'Battle Worn' }
      ],
      // Mouth Variants
      mouth: [
        { id: 'variant01', label: 'Gentle Grin' },
        { id: 'variant02', label: 'Rogue Smirk' },
        { id: 'variant03', label: 'Joyful Open' },
        { id: 'variant04', label: 'Stoic Neutral' },
        { id: 'variant05', label: 'Grim Grit' },
        { id: 'variant06', label: 'Playful Chuckle' },
        { id: 'variant07', label: 'Soft Smirk' },
        { id: 'variant08', label: 'Battle Cry' }
      ],
      // Glasses Variants
      glasses: [
        { id: 'variant01', label: 'Alchemist Spectacles' },
        { id: 'variant02', label: 'Artificer Round' },
        { id: 'variant03', label: 'Arcane Half-Frame' },
        { id: 'variant04', label: 'Square Ranger' },
        { id: 'variant05', label: 'Aviator Goggles' }
      ],
      backgrounds: [
        { id: 'transparent', label: 'Void Translucent', color: 'transparent' },
        { id: '1e1b4b', label: 'Night Twilight', color: '#1e1b4b' },
        { id: '0f172a', label: 'Abyssal Slate', color: '#0f172a' },
        { id: '064e3b', label: 'Emerald Glade', color: '#064e3b' },
        { id: '4c0519', label: 'Blood Moon', color: '#4c0519' },
        { id: '311042', label: 'Arcane Void', color: '#311042' }
      ]
    };

    /* 5 Preset Characters */
    const PREMADE_CHARACTERS = [
      {
        id: 'kaelen',
        name: 'Kaelen Arcane Ranger',
        classTitle: 'Mystic Ranger',
        seed: 'KaelenVane',
        hair: 'short04',
        isOmbre: true,
        hairColor: '592454',
        hairTipColor: '85c2c6',
        skinColor: 'ecad80',
        eyes: 'variant02',
        eyebrows: 'variant04',
        mouth: 'variant02',
        glassesEnabled: true,
        glasses: 'variant05',
        backgroundColor: '1e1b4b'
      },
      {
        id: 'lyra',
        name: 'Lyra Sunstrider',
        classTitle: 'Solar Knight',
        seed: 'LyraSun',
        hair: 'long06',
        isOmbre: true,
        hairColor: 'b9a05f',
        hairTipColor: 'e5d7a3',
        skinColor: 'f2d3b1',
        eyes: 'variant01',
        eyebrows: 'variant02',
        mouth: 'variant01',
        glassesEnabled: false,
        glasses: 'variant01',
        backgroundColor: '0f172a'
      },
      {
        id: 'zephyr',
        name: 'Zephyr Shadowblade',
        classTitle: 'Night Assassin',
        seed: 'ZephyrBlade',
        hair: 'short10',
        isOmbre: false,
        hairColor: '0e0e0e',
        hairTipColor: 'ab2a18',
        skinColor: 'd08b5b',
        eyes: 'variant06',
        eyebrows: 'variant04',
        mouth: 'variant04',
        glassesEnabled: true,
        glasses: 'variant03',
        backgroundColor: '311042'
      },
      {
        id: 'aria',
        name: 'Aria Chrono-Mage',
        classTitle: 'Temporal Sage',
        seed: 'AriaChrono',
        hair: 'long05',
        isOmbre: true,
        hairColor: 'dba3be',
        hairTipColor: '85c2c6',
        skinColor: 'f2d3b1',
        eyes: 'variant03',
        eyebrows: 'variant05',
        mouth: 'variant03',
        glassesEnabled: true,
        glasses: 'variant02',
        backgroundColor: '1e1b4b'
      },
      {
        id: 'torin',
        name: 'Torin Deep-Delver',
        classTitle: 'Forge Master',
        seed: 'TorinDeep',
        hair: 'short01',
        isOmbre: false,
        hairColor: 'ac6511',
        hairTipColor: 'b9a05f',
        skinColor: '9e5622',
        eyes: 'variant09',
        eyebrows: 'variant03',
        mouth: 'variant05',
        glassesEnabled: true,
        glasses: 'variant01',
        backgroundColor: '064e3b'
      }
    ];


globalThis.CharacterPresets={options:PRESETS,heroes:PREMADE_CHARACTERS};
})();
