// Leaders & Changemakers (deck id "pms"): prime ministers, presidents, rulers and movement leaders.
// Each tile shows a portrait (from Wikipedia, free licences only) next to the clue, so you learn
// the face with the name. The portraits can be switched off with the "Hide portraits" option.
//
// Where the people come from:
//  - The first 104 are the original Prime Ministers & Presidents list (ids pm0 to pm103). Never
//    reorder them: saved progress is keyed by these ids. Their round comes from ORIGINAL_ROUNDS.
//  - NEW_LEADERS (leaders-data.ts) carries on from pm104, by position.
//
// No two leaders may share an alias (the matcher gives a spelling to the first leader who owns it).
// So a surname shared by several leaders (Johnson, Wilson, Roosevelt, Bush, Harrison...) is left off
// as a bare alias, and each of them is reached by a longer form such as "Lyndon Johnson" or "FDR".
// UK numbers count every appointment from Robert Walpole (Starmer is the 58th), so Baldwin,
// MacDonald, Churchill and Wilson show each number they held. US numbers are the usual count:
// Cleveland (22nd and 24th) and Trump (45th and 47th) are one person each.
import type { Deck, Item, Variant } from "../engine/types";
import { createLeaderBoard } from "../boards/leaderBoard";
import { ORIGINAL_ROUNDS, NEW_LEADERS } from "./leaders-data";

/** The original 104 lines: name | clue | other accepted answers | old list (au, uk or us). */
const ORIGINAL_TABLE = `Edmund Barton|1st · 1901–1903|Barton|au
Alfred Deakin|2nd · 1903–1910, three terms|Deakin|au
Chris Watson|3rd · 1904|Watson|au
George Reid|4th · 1904–1905|Reid|au
Andrew Fisher|5th · 1908–1915, three terms|Fisher|au
Joseph Cook|6th · 1913–1914|Cook|au
Billy Hughes|7th · 1915–1923|Hughes;William Hughes|au
Stanley Bruce|8th · 1923–1929|Bruce|au
James Scullin|9th · 1929–1932|Scullin|au
Joseph Lyons|10th · 1932–1939|Lyons|au
Earle Page|11th · 1939, 19 days|Page|au
Robert Menzies|12th · 1939–1941, 1949–1966|Menzies;Bob Menzies|au
Arthur Fadden|13th · 1941|Fadden|au
John Curtin|14th · 1941–1945|Curtin|au
Frank Forde|15th · 1945, 8 days|Forde|au
Ben Chifley|16th · 1945–1949|Chifley|au
Harold Holt|17th · 1966–1967, vanished at sea|Holt|au
John McEwen|18th · 1967–1968|McEwen|au
John Gorton|19th · 1968–1971|Gorton|au
William McMahon|20th · 1971–1972|McMahon;Billy McMahon|au
Gough Whitlam|21st · 1972–1975|Whitlam|au
Malcolm Fraser|22nd · 1975–1983|Fraser|au
Bob Hawke|23rd · 1983–1991|Hawke|au
Paul Keating|24th · 1991–1996|Keating|au
John Howard|25th · 1996–2007|Howard|au
Kevin Rudd|26th · 2007–2010, 2013|Rudd|au
Julia Gillard|27th · 2010–2013|Gillard|au
Tony Abbott|28th · 2013–2015|Abbott|au
Malcolm Turnbull|29th · 2015–2018|Turnbull|au
Scott Morrison|30th · 2018–2022|Morrison|au
Anthony Albanese|31st · 2022–|Albanese|au
Lord Salisbury|1895–1902|Salisbury|uk
Arthur Balfour|1902–1905|Balfour|uk
Henry Campbell-Bannerman|1905–1908|Campbell-Bannerman;CB|uk
H. H. Asquith|1908–1916|Asquith;Herbert Asquith|uk
David Lloyd George|1916–1922|Lloyd George|uk
Bonar Law|1922–1923|Andrew Bonar Law|uk
Stanley Baldwin|1923–1924, 1924–1929, 1935–1937|Baldwin|uk
Ramsay MacDonald|1924, 1929–1935|MacDonald|uk
Neville Chamberlain|1937–1940|Chamberlain|uk
Winston Churchill|1940–1945, 1951–1955|Churchill|uk
Clement Attlee|1945–1951|Attlee|uk
Anthony Eden|1955–1957|Eden|uk
Harold Macmillan|1957–1963|Macmillan|uk
Alec Douglas-Home|1963–1964|Douglas-Home;Lord Home|uk
Harold Wilson|1964–1970, 1974–1976||uk
Edward Heath|1970–1974|Heath;Ted Heath|uk
James Callaghan|1976–1979|Callaghan;Jim Callaghan|uk
Margaret Thatcher|1979–1990|Thatcher|uk
John Major|1990–1997|Major|uk
Tony Blair|1997–2007|Blair|uk
Gordon Brown|2007–2010|Brown|uk
David Cameron|2010–2016|Cameron|uk
Theresa May|2016–2019|May|uk
Boris Johnson|2019–2022||uk
Liz Truss|2022, 49 days|Truss|uk
Rishi Sunak|2022–2024|Sunak|uk
Keir Starmer|2024–2026|Starmer|uk
Andy Burnham|2026–|Burnham|uk
George Washington|1st · 1789–1797|Washington|us
John Adams|2nd · 1797–1801|Adams|us
Thomas Jefferson|3rd · 1801–1809|Jefferson|us
James Madison|4th · 1809–1817|Madison|us
James Monroe|5th · 1817–1825|Monroe|us
John Quincy Adams|6th · 1825–1829|JQ Adams;JQA|us
Andrew Jackson|7th · 1829–1837|Jackson|us
Martin Van Buren|8th · 1837–1841|Van Buren|us
William Henry Harrison|9th · 1841, 31 days|Harrison;William Harrison|us
John Tyler|10th · 1841–1845|Tyler|us
James K. Polk|11th · 1845–1849|Polk;James Polk|us
Zachary Taylor|12th · 1849–1850|Taylor|us
Millard Fillmore|13th · 1850–1853|Fillmore|us
Franklin Pierce|14th · 1853–1857|Pierce|us
James Buchanan|15th · 1857–1861|Buchanan|us
Abraham Lincoln|16th · 1861–1865|Lincoln;Abe Lincoln|us
Andrew Johnson|17th · 1865–1869||us
Ulysses S. Grant|18th · 1869–1877|Grant;Ulysses Grant|us
Rutherford B. Hayes|19th · 1877–1881|Hayes;Rutherford Hayes|us
James A. Garfield|20th · 1881, shot after 200 days|Garfield;James Garfield|us
Chester A. Arthur|21st · 1881–1885|Chester Arthur|us
Grover Cleveland|22nd and 24th · 1885–1889, 1893–1897|Cleveland|us
Benjamin Harrison|23rd · 1889–1893|Ben Harrison|us
William McKinley|25th · 1897–1901|McKinley|us
Theodore Roosevelt|26th · 1901–1909|Teddy Roosevelt;Teddy|us
William Howard Taft|27th · 1909–1913|Taft;William Taft|us
Woodrow Wilson|28th · 1913–1921|Woodrow|us
Warren G. Harding|29th · 1921–1923|Harding;Warren Harding|us
Calvin Coolidge|30th · 1923–1929|Coolidge|us
Herbert Hoover|31st · 1929–1933|Hoover|us
Franklin D. Roosevelt|32nd · 1933–1945|FDR;Franklin Roosevelt|us
Harry S. Truman|33rd · 1945–1953|Truman;Harry Truman|us
Dwight D. Eisenhower|34th · 1953–1961|Eisenhower;Ike;Dwight Eisenhower|us
John F. Kennedy|35th · 1961–1963|Kennedy;JFK;John Kennedy|us
Lyndon B. Johnson|36th · 1963–1969|Lyndon Johnson;LBJ|us
Richard Nixon|37th · 1969–1974|Nixon|us
Gerald Ford|38th · 1974–1977|Gerald R. Ford|us
Jimmy Carter|39th · 1977–1981|Carter|us
Ronald Reagan|40th · 1981–1989|Reagan|us
George H. W. Bush|41st · 1989–1993|George HW Bush;Bush Sr;Bush Senior|us
Bill Clinton|42nd · 1993–2001|Clinton;William Clinton|us
George W. Bush|43rd · 2001–2009|George W Bush;Bush Jr;Bush Junior|us
Barack Obama|44th · 2009–2017|Obama|us
Donald Trump|45th and 47th · 2017–2021, 2025–|Trump|us
Joe Biden|46th · 2021–2025|Biden;Joseph Biden|us`;

const roundOf = ORIGINAL_ROUNDS;

const originals: Item[] = ORIGINAL_TABLE.split("\n").map((line, i) => {
  const [name, clue, aliases, oldList] = line.split("|");
  // UK lines only had their years; say what the job was.
  const text = oldList === "uk" ? `Prime Minister · ${clue.trim()}` : clue.trim();
  return {
    id: `pm${i}`,
    name: name.trim(),
    aliases: aliases ? aliases.split(";").map((a) => a.trim()).filter(Boolean) : [],
    tags: [roundOf[i]],
    data: { clue: text },
  };
});

/** "name | country | years | role | round | aliases" lines carry on from pm104. */
const newcomers: Item[] = NEW_LEADERS.trim().split("\n").map((line, i) => {
  const [name, country, years, role, round, aliases] = line.split("|");
  return {
    id: `pm${originals.length + i}`,
    name: name.trim(),
    aliases: (aliases ?? "").split(";").map((a) => a.trim()).filter(Boolean),
    tags: [round.trim()],
    data: { clue: `${role.trim()} · ${country.trim()} · ${years.trim()}` },
  };
});

const items = [...originals, ...newcomers];

/** A round: everyone tagged with its id. */
const round = (id: string, label: string, minutes: number, starter = false): Variant => ({
  id, label, minutes, starter, filter: (i) => i.tags.includes(id),
});

const GROUPS = [
  { tag: "au", label: "Australian PMs" },
  { tag: "uk-ww2", label: "UK PMs from WW2" },
  { tag: "us-ww2", label: "US presidents from WW2" },
  { tag: "before-ww2", label: "Big names before WW2" },
  { tag: "changemakers", label: "Changemakers" },
  { tag: "rulers", label: "Rulers through history" },
  { tag: "world", label: "World leaders since 1900" },
];

export const pmDeck: Deck = {
  id: "pms",
  title: "Leaders & Changemakers",
  subject: "History",
  blurb:
    "Prime ministers, presidents, rulers and the people who led movements. A portrait and their years are your clue. Type them in any order.",
  noun: "leaders",
  mode: "any",
  items,
  variants: [
    round("au", "Australian PMs", 6, true),
    round("uk-ww2", "UK PMs from WW2", 4),
    round("us-ww2", "US presidents from WW2", 4),
    round("before-ww2", "Big names before WW2", 3),
    round("changemakers", "Changemakers", 3),
    round("rulers", "Rulers through history", 6),
    round("world", "World leaders since 1900", 10),
    // Everyone except the "spare" people, who are kept in the list but never asked.
    { id: "all-leaders", label: "Everyone", minutes: 25, filter: (i) => !i.tags.includes("spare") },
  ],
  options: [
    {
      // Off by default, so the usual best-score key is just the round id.
      id: "noportraits",
      label: "Hide portraits",
      hint: "Clues only, no photos from Wikipedia.",
      default: false,
    },
  ],
  progressGroups: GROUPS,
  describe: (i) => `${i.data!.clue as string}: ${i.name}`,
  tip: "Portraits come from Wikipedia. Hover over one to see who took it and its licence.",
  createBoard: ({ container, items: playing, options }) =>
    createLeaderBoard(container, playing, {
      clue: (i) => i.data!.clue as string,
      groups: GROUPS,
      portraits: !options.noportraits,
    }),
};
