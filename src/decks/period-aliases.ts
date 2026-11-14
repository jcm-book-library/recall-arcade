// ERAS & DYNASTIES: the short forms Fill the List accepts for a period's name ("WWII", "World War 2", "Ming" for
// "The Ming dynasty"). normalize() already ignores "The", case, accents and punctuation, so only real alternatives
// are built here.
//
// Two kinds:
//   1. Generated: a name ending in dynasty, empire, period, era or age is also accepted without that last word
//      ("Ming", "Tang", "Tudor", "Victorian"), and with it spelt either way ("Ming dynasty"). A short form is kept only
//      if no other period in the list produces it, so "Roman" is not accepted (Republic or Empire?) but "Byzantine" is.
//   2. A small hand-written list for the rest (the wars with numbers, "Vietnam" for the Vietnam War, ...).
import type { Period } from "./periods";

const SUFFIX = /\s+(dynasty|empire|period|era|age)$/i;

const MANUAL: Record<string, string[]> = {
  e154: ["WWI", "WW1", "World War 1", "World War One", "First World War", "The Great War", "Great War"],
  e155: ["WWII", "WW2", "World War 2", "World War Two", "Second World War"],
  e80: ["Vietnam", "Vietnam War", "The Vietnam War", "American War in Vietnam"],
  e81: ["Korea", "Korean", "Korean War"],
  e86: ["Watergate", "Watergate scandal"],
  e87: ["Chinese Civil War", "China Civil War"],
  e88: ["Civil Rights Movement", "Civil Rights", "American Civil Rights Movement", "Civil Rights Era", "US Civil Rights"],
  e90: ["French Revolution"],
  e91: ["Iran hostage crisis", "Iranian hostage crisis", "Hostage crisis", "Iran hostages"],
  e92: ["Spanish Civil War", "Spain Civil War"],
  e93: ["Great Depression", "The Depression", "Depression"],
  e96: ["English Civil War", "English Civil Wars", "Cromwell's war"],
  e113: ["Industrial Revolution", "Industrial Age"],
  e115: ["Crusades", "The Crusades", "Crusade"],
  e119: ["Spanish Inquisition", "Inquisition"],
  e133: ["Hundred Years War", "100 Years War", "Hundred Years' War"],
  e134: ["Wars of the Roses", "War of the Roses", "Roses"],
  e136: ["Apartheid", "South African apartheid", "Apartheid era"],
  e137: ["Opium Wars", "Opium War", "Opium"],
  e138: ["Dutch East India Company", "VOC", "Dutch East India", "East India Company"],
  e156: ["Cold War"],
  e157: ["Space Race", "Space Age"],
  e158: ["American Revolution", "American Revolutionary War", "Revolutionary War", "American War of Independence", "War of Independence", "US Revolution"],
  e159: ["American Civil War", "US Civil War", "United States Civil War"],
  e160: ["Greco-Persian Wars", "Graeco-Persian Wars", "Persian Wars", "Greek Persian Wars", "Greco Persian War", "Persian War"],
  e161: ["Bronze Age"],
  e162: ["Classical Greece", "Ancient Greece", "Classical Athens", "Golden Age of Athens", "Classical Period Greece"],
  e163: ["Roman Republic", "Republican Rome", "Rome Republic", "Republic of Rome"],
  e164: ["Roman Empire", "Imperial Rome", "Rome Empire"],
  e169: ["Islamic Golden Age", "Golden Age of Islam", "Muslim Golden Age", "Islamic Golden Era"],
  e170: ["Viking Age", "Vikings", "Viking Era", "Viking Period", "Age of the Vikings"],
  e173: ["Black Death", "The Plague", "Bubonic Plague", "Plague"],
  e176: ["Renaissance", "The Renaissance"],
  e177: ["Age of Exploration", "Age of Discovery", "Exploration", "Age of Sail", "Era of Exploration"],
  e178: ["Tudor", "Tudors", "Tudor period", "Tudor era", "Tudor England", "Tudor dynasty"],
  e179: ["Reformation", "Protestant Reformation"],
  e180: ["Mughal", "Moghul", "Mogul", "Mughal Empire", "Mogul Empire", "Mughals"],
  e181: ["Stuart", "Stuarts", "Stuart period", "Stuart era", "Stuart England"],
  e182: ["Edo", "Edo period", "Tokugawa", "Tokugawa shogunate", "Tokugawa period", "Edo era"],
  e183: ["Qing", "Ch'ing", "Manchu", "Qing dynasty", "Manchu dynasty"],
  e184: ["Enlightenment", "Age of Enlightenment", "Age of Reason"],
  e185: ["Georgian", "Georgian era", "Georgian England", "Georgian period", "Georgians"],
  e186: ["Victorian", "Victorian era", "Victorian age", "Victorian England", "Victorians", "Victorian period"],
  e187: ["Gold rushes", "Gold rush", "Australian gold rush", "Australian gold rushes", "Victorian gold rush", "Gold rush era"],
  e188: ["Meiji", "Meiji era", "Meiji period", "Meiji Japan", "Meiji restoration"],
  e189: ["Interwar", "Interwar period", "Inter-war period", "Interwar years", "Between the wars", "Interwar era", "Inter war years"],
  e190: ["Digital Age", "Information Age", "Digital Era", "Digital", "Digital revolution", "Computer age", "Internet age"],
  e168: ["Tang", "Tang dynasty", "Tang China"],
  e171: ["Song", "Sung", "Song dynasty", "Sung dynasty", "Song China"],
  e172: ["Mongol Empire", "Mongols", "Mongol", "Mongol Empire", "Mongol Era"],
  e174: ["Ottoman", "Ottomans", "Ottoman Empire", "Ottoman Turks", "Turkish Empire"],
  e175: ["Ming", "Ming dynasty", "Ming China"],
  e165: ["Han", "Han dynasty", "Han China"],
  e166: ["Gupta", "Gupta Empire", "Gupta period", "Gupta dynasty"],
  e167: ["Byzantine", "Byzantines", "Byzantium", "Byzantine Empire", "Eastern Roman Empire"],
};

/** Everything a period's name can be typed as (the name itself first). */
export function periodAliases(p: Period, all: Period[]): string[] {
  const out = new Set<string>([p.name, ...(MANUAL[p.id] ?? [])]);
  const m = p.name.match(SUFFIX);
  if (m) {
    const short = p.name.replace(SUFFIX, "");
    const bare = (n: string) => n.replace(SUFFIX, "").toLowerCase().replace(/^the /, "");
    // Also a clash when it is the start of another name ("Roman" for the Roman Empire and the Roman Republic).
    const clash = all.some((q) => q.id !== p.id && (bare(q.name) === bare(p.name) || q.name.toLowerCase().replace(/^the /, "").startsWith(`${bare(p.name)} `)));
    if (!clash) out.add(short);
  }
  return [...out];
}
