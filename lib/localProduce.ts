import type { ImageSourcePropType } from "react-native";

/**
 * Name-level mapping from the bundled local `products/` image database to product
 * titles. Metro requires static literal paths, so every image is required up front.
 *
 * The resolver matches the product title/category by substring, checking the most
 * specific tokens first (e.g. "green mango" before "mango", "small onion" before
 * "onion"), so listings render their real produce image instead of a generic
 * category placeholder.
 */
type Entry = { keys: string[]; src: ImageSourcePropType };

const ENTRIES: Entry[] = [
  // Vegetables (most specific first)
  { keys: ["green cherry", "green-cherry", "cherry tomato", "green cherry tomato", "cherry"], src: require("../products/vegetables/tomato.jpeg") },
  { keys: ["green chilli", "green chili", "chilli", "chili"], src: require("../products/vegetables/green-chilli.jpg") },
  { keys: ["okra", "bhindi", "bindi", "ladyfinger", "lady finger"], src: require("../products/vegetables/okra(bindi).jpg") },
  { keys: ["drumstick"], src: require("../products/vegetables/drumstick.png") },
  { keys: ["moringa"], src: require("../products/vegetables/moringa-leaves.jpg") },
  { keys: ["elephant yam", "suran", "yam"], src: require("../products/vegetables/elephant-yam.jpg") },
  { keys: ["jackfruit"], src: require("../products/vegetables/jackfruit-tender.jpg") },
  { keys: ["broad bean", "broad beans", "bean"], src: require("../products/vegetables/broad-beans.jpg") },
  { keys: ["banana leaf"], src: require("../products/vegetables/banana-leaf.webp") },
  { keys: ["new crop onion", "onion new", "nion-new-crop"], src: require("../products/vegetables/nion-new-crop.jpg") },
  { keys: ["old crop onion", "onion old", "onion-old-crop"], src: require("../products/vegetables/onion-old-crop.jpg") },
  { keys: ["onion", "onions", "red onion", "white onion", "yellow onion", "pyaz", "pyaaz"], src: require("../products/vegetables/onion.png") },
  { keys: ["garlic"], src: require("../products/vegetables/garlic.png") },
  { keys: ["ginger"], src: require("../products/vegetables/ginger.png") },
  { keys: ["cucumber"], src: require("../products/vegetables/cucumber.jpeg") },
  { keys: ["tomato"], src: require("../products/vegetables/tomato.jpeg") },

  // Fruits
  { keys: ["green mango", "raw mango"], src: require("../products/fruits/green-mango.jpg") },
  { keys: ["mango", "mago", "mago-grape", "mango-grape", "mago arabia", "mango arabia", "mango-purple", "mago-purple"], src: require("../products/fruits/mango.webp") },
  { keys: ["green banana", "raw banana"], src: require("../products/fruits/banana-green.jpg") },
  { keys: ["banana"], src: require("../products/fruits/banana.webp") },
  { keys: ["black grape"], src: require("../products/fruits/black-grapes.webp") },
  { keys: ["green grape"], src: require("../products/fruits/green-grapes.webp") },
  { keys: ["grape"], src: require("../products/fruits/black-grapes.webp") },
  { keys: ["apple"], src: require("../products/fruits/apple.webp") },
  { keys: ["orange"], src: require("../products/fruits/orange.webp") },
  { keys: ["pomegranate", "anar"], src: require("../products/fruits/pomegranate.webp") },
  { keys: ["papaya"], src: require("../products/fruits/papaya.webp") },
  { keys: ["watermelon"], src: require("../products/fruits/watermelon.webp") },
  { keys: ["pineapple"], src: require("../products/fruits/pineapple.webp") },
  { keys: ["guava"], src: require("../products/fruits/guava.jpg") },
  { keys: ["kiwi"], src: require("../products/fruits/kiwi.webp") },
  { keys: ["strawberry", "strawberry(uae)", "strawberry uae"], src: require("../products/fruits/strawberry.webp") },
  { keys: ["lime", "lemon"], src: require("../products/fruits/lime.jpg") },
  { keys: ["chiku", "sapota"], src: require("../products/fruits/chiku.jpg") },
  { keys: ["custard apple", "sitaphal"], src: require("../products/fruits/custard-apple.jpg") },
  { keys: ["tamarind"], src: require("../products/fruits/green-tamarind.jpg") },
  { keys: ["amala", "amla", "gooseberry"], src: require("../products/fruits/amala.jpg") },

  // Nuts & dry fruits
  { keys: ["almond", "badam"], src: require("../products/nuts/almond.webp") },
  { keys: ["cashew", "kaju"], src: require("../products/nuts/cashew.webp") },
  { keys: ["walnut", "akhrot"], src: require("../products/nuts/walnut.webp") },
  { keys: ["pista", "pistachio"], src: require("../products/nuts/pista.webp") },
  { keys: ["date", "khajoor"], src: require("../products/nuts/dates.webp") },
  { keys: ["raisin", "kishmish"], src: require("../products/nuts/raisins.webp") },
  { keys: ["dry coconut", "copra"], src: require("../products/nuts/coconut-dry.jpg") },
  { keys: ["mixed nut", "nut"], src: require("../products/nuts/mixed-nuts.webp") },

  // Spices
  { keys: ["turmeric", "haldi"], src: require("../products/spices/turmeric-roots.webp") },
  { keys: ["cumin", "jeera"], src: require("../products/spices/cumin.webp") },
  { keys: ["coriander", "dhania"], src: require("../products/spices/coriander-seeds.webp") },
  { keys: ["cardamom", "elaichi"], src: require("../products/spices/cardamom.webp") },
  { keys: ["cinnamon"], src: require("../products/spices/cinnamon-sticks.webp") },
  { keys: ["clove", "laung"], src: require("../products/spices/clove.webp") },
  { keys: ["black pepper", "pepper"], src: require("../products/spices/black-pepper.webp") },
  { keys: ["red chilli powder", "chilli powder"], src: require("../products/spices/red-chilli-powder.webp") },
  { keys: ["fennel", "saunf"], src: require("../products/spices/fennel-seeds.webp") },
  { keys: ["mustard"], src: require("../products/spices/black-mustard-seeds.webp") },
  { keys: ["bay leaf", "bay leaves", "tej patta"], src: require("../products/spices/bay-leaves.webp") },
  { keys: ["saffron", "kesar"], src: require("../products/spices/saffron.webp") },
  { keys: ["star anise"], src: require("../products/spices/star-anise.webp") },
  { keys: ["garam masala"], src: require("../products/spices/garam-masala.webp") },

  // Eggs
  { keys: ["brown egg"], src: require("../products/eggs/brown-eggs.webp") },
  { keys: ["quail egg"], src: require("../products/eggs/quail-eggs.webp") },
  { keys: ["egg"], src: require("../products/eggs/white-eggs.webp") },

  // Oils
  { keys: ["groundnut oil", "peanut oil"], src: require("../products/oils/groundnut-oil.webp") },
  { keys: ["olive oil"], src: require("../products/oils/olive-oil.webp") },
  { keys: ["sesame oil", "gingelly"], src: require("../products/oils/sesame-oil.webp") },
  { keys: ["sunflower oil", "oil"], src: require("../products/oils/sunflower-oil.webp") },

  // Coconut (fresh) fallback
  { keys: ["coconut"], src: require("../products/vegetables/cocnut.webp") },
];

/** Returns a bundled `products/` image matching the title/category, or null. */
export function localProduceImage(
  title?: string | null,
  category?: string | null
): ImageSourcePropType | null {
  const hay = `${title || ""} ${category || ""}`.toLowerCase();
  if (!hay.trim()) return null;
  for (const entry of ENTRIES) {
    if (entry.keys.some((key) => hay.includes(key))) return entry.src;
  }
  return null;
}
