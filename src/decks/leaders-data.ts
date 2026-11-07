// LEADERS & CHANGEMAKERS: rounds and extra people. Imported from the owner's quiz-lists
// spreadsheet ("World Leaders" tab) on 7 Nov 2026. The original 104 leaders keep their lines in
// text-decks.ts (ids pm0 to pm103, by position); this file says which round each is in.
//
// Round codes: au = Australian PMs, uk-ww2 = UK PMs from WW2 (Chamberlain on), us-ww2 = US presidents
// from WW2 (FDR on), before-ww2 = big names before WW2, changemakers = movement leaders,
// rulers = rulers through history, world = world leaders since 1900, spare = kept but not asked.

/** Round for each original leader, in the same order as the pm table (pm0, pm1, ...). */
export const ORIGINAL_ROUNDS = "au au au au au au au au au au au au au au au au au au au au au au au au au au au au au au au spare spare spare spare before-ww2 spare spare spare uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 uk-ww2 before-ww2 spare before-ww2 spare spare spare spare spare spare spare spare spare spare spare spare before-ww2 spare spare spare spare spare spare spare spare spare before-ww2 spare before-ww2 spare spare spare us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2 us-ww2".split(" ");

// NEW_LEADERS: name | country | years in office | role | round | other accepted answers (; separated)
// Ids are pm104 onwards, by position. Never reorder; add new people at the end.
export const NEW_LEADERS = `
Mahatma Gandhi|India|1915–1947|Led India's independence movement|changemakers|Gandhi; Mohandas Gandhi
Martin Luther King Jr.|United States|1955–1968|Led the US civil rights movement|changemakers|MLK; Martin Luther King
Elizabeth II|United Kingdom|1952–2022|Queen for 70 years|world|Queen Elizabeth; Queen Elizabeth II
Julius Caesar|Roman Republic|49–44 BC|Roman general and dictator|rulers|Caesar
Alexander the Great|Macedon|336–323 BC|King who conquered the Persian Empire|rulers|Alexander
Cleopatra|Egypt|51–30 BC|Last active ruler of Ptolemaic Egypt|rulers|Cleopatra VII
Elizabeth I|England|1558–1603|Queen of England|rulers|Queen Elizabeth I
Joan of Arc|France|1429–1431|Led French armies in the Hundred Years' War|changemakers|Jeanne d'Arc
Napoleon Bonaparte|France|1799–1815|First Consul, then Emperor of the French|rulers|Napoleon
Queen Victoria|United Kingdom|1837–1901|Queen for 63 years|rulers|Victoria
Nelson Mandela|South Africa|1994–1999|Anti-apartheid leader, then president|changemakers|Mandela
Vladimir Putin|Russia|2000–2008, 2012–|President (prime minister in between)|world|Putin
Angela Merkel|Germany|2005–2021|Chancellor|world|Merkel
Catherine the Great|Russia|1762–1796|Empress|rulers|Catherine II
Genghis Khan|Mongol Empire|1206–1227|Founder of the Mongol Empire|rulers|Chinggis Khan
Henry VIII|England|1509–1547|King with six wives|rulers|King Henry VIII
Otto von Bismarck|Germany|1871–1890|First chancellor of a united Germany|rulers|Bismarck
Louis XIV|France|1643–1715|The 'Sun King'|rulers|The Sun King
Augustus|Roman Empire|27 BC–AD 14|First Roman emperor|rulers|Augustus Caesar; Octavian
Charlemagne|Frankish Empire|768–814|King of the Franks, emperor from 800|rulers|Charles the Great
Emperor Meiji|Japan|1867–1912|Emperor who modernised Japan|rulers|Meiji
Ashoka the Great|Maurya Empire (India)|c. 268–232 BC|Emperor who spread Buddhism|rulers|Ashoka; Asoka
Peter the Great|Russia|1682–1725|Tsar who modernised Russia|rulers|Peter I
Joseph Stalin|Soviet Union|1924–1953|Soviet dictator|world|Stalin
Vladimir Lenin|Soviet Russia|1917–1924|Led the Bolshevik revolution|world|Lenin
Shinzo Abe|Japan|2006–2007, 2012–2020|Prime minister|world|Abe
Charles de Gaulle|France|1959–1969|Led the Free French in WWII, then president|world|de Gaulle
Benito Mussolini|Italy|1922–1943|Fascist dictator|world|Mussolini
Nikita Khrushchev|Soviet Union|1953–1964|Soviet leader in the Cuban Missile Crisis|world|Khrushchev
Kemal Atatürk|Turkey|1923–1938|Founder and first president of modern Turkey|world|Atatürk; Ataturk; Mustafa Kemal
Adolf Hitler|Germany|1933–1945|Nazi dictator|world|Hitler
Mao Zedong|China|1949–1976|Founder of the People's Republic of China|world|Mao; Chairman Mao
Francisco Franco|Spain|1939–1975|Dictator after the Spanish Civil War|world|Franco
Saddam Hussein|Iraq|1979–2003|Dictator|world|Saddam
Augusto Pinochet|Chile|1973–1990|Military dictator|world|Pinochet
Kim Jong-un|North Korea|2011–|Supreme leader|world|Kim Jong Un
Fulgencio Batista|Cuba|1940–1944, 1952–1959|Overthrown in the Cuban Revolution|world|Batista
Muammar Gaddafi|Libya|1969–2011|Dictator|world|Gaddafi; Qaddafi
Kim Jong-il|North Korea|1994–2011|Supreme leader|world|Kim Jong Il
Idi Amin|Uganda|1971–1979|Military dictator|world|Amin
Bashar al-Assad|Syria|2000–2024|President, overthrown in 2024|world|Assad
Kim Il-sung|North Korea|1948–1994|Founder of North Korea|world|Kim Il Sung
Pol Pot|Cambodia|1975–1979|Khmer Rouge leader|world|
Ferdinand Marcos|Philippines|1965–1986|President, then dictator|world|Marcos
François Duvalier|Haiti|1957–1971|Dictator, 'Papa Doc'|world|Papa Doc; Duvalier
Jacques Chirac|France|1995–2007|President|world|Chirac
Emmanuel Macron|France|2017–|President|world|Macron
Nicolas Sarkozy|France|2007–2012|President|world|Sarkozy
`;
