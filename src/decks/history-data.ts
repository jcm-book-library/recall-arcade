// BIG MOMENTS and ERAS & DYNASTIES: the data. Imported from the owner's quiz-lists spreadsheet
// ("Big Moments" tab) on 7 Nov 2026. The sheet is the source: change it there, then re-import.
//
// EVENT_TABLE:  id | year (negative = BC) | event | "c" if the date is approximate | the period it belongs to (optional)
// Ids are permanent (saved scores use them). e0 to e79 are the original events; newer ones use the
// sheet's "game id" column, so there are gaps.
export const EVENT_TABLE = `
e0|-2560|The Great Pyramid of Giza is completed|c|
e1|-1754|Hammurabi's code of laws is written in Babylon|c|
e2|-1332|Tutankhamun becomes pharaoh of Egypt|c|
e3|-776|The first recorded Olympic Games are held in Greece||
e4|-753|Rome is founded (according to legend)||
e5|-490|The Battle of Marathon||The Greco-Persian Wars
e6|-323|Alexander the Great dies in Babylon||
e7|-221|Qin Shi Huang unifies China as its first emperor||
e8|-44|Julius Caesar is assassinated||
e9|79|Mount Vesuvius erupts and buries Pompeii||
e10|80|The Colosseum in Rome opens||
e11|330|Constantinople becomes the capital of the Roman Empire||
e12|476|The Western Roman Empire falls||
e13|622|Muhammad's journey from Mecca to Medina (the Hijra)||
e14|793|Vikings raid the monastery at Lindisfarne||
e15|800|Charlemagne is crowned emperor||
e16|1066|The Battle of Hastings: the Normans conquer England||
e17|1099|The First Crusade captures Jerusalem||
e18|1150|Angkor Wat in Cambodia is completed|c|
e19|1206|Genghis Khan founds the Mongol Empire||
e20|1215|Magna Carta is sealed by King John||
e21|1347|The Black Death reaches Europe||
e22|1453|Constantinople falls to the Ottomans||
e23|1455|Gutenberg prints his Bible on a printing press|c|
e24|1492|Columbus reaches the Americas||
e25|1517|Martin Luther publishes his 95 Theses||
e26|1522|Magellan's expedition completes the first voyage around the world||
e27|1543|Copernicus publishes that the Earth orbits the Sun||
e28|1564|William Shakespeare is born||
e29|1588|England defeats the Spanish Armada||
e30|1610|Galileo publishes what he saw through his telescope||
e31|1620|The Mayflower lands in America||
e32|1632|Construction of the Taj Mahal begins||
e33|1666|The Great Fire of London||
e34|1687|Isaac Newton publishes his laws of motion and gravity||
e35|1770|James Cook charts the east coast of Australia||
e36|1776|The US Declaration of Independence||The American Revolutionary War
e37|1788|The First Fleet arrives at Sydney Cove||
e38|1789|The Storming of the Bastille starts the French Revolution||The French Revolution
e39|1815|Napoleon is defeated at the Battle of Waterloo||
e40|1825|The first public steam railway opens in England||
e41|1833|Britain passes the Slavery Abolition Act||
e42|1851|Gold is discovered in Victoria, starting a gold rush||
e43|1859|Darwin publishes On the Origin of Species||
e44|1861|The American Civil War begins||The American Civil War
e45|1869|The Suez Canal opens||
e46|1876|Alexander Graham Bell patents the telephone||
e47|1880|Ned Kelly is captured at Glenrowan||
e48|1889|The Eiffel Tower is completed||
e49|1893|New Zealand becomes the first country where women can vote||
e50|1901|The Federation of Australia||
e51|1903|The Wright brothers make the first powered flight||
e52|1912|The Titanic sinks||
e53|1914|World War I begins||World War I
e54|1915|The Gallipoli landing||World War I
e55|1917|The Russian Revolution||
e56|1918|World War I ends||World War I
e57|1928|Alexander Fleming discovers penicillin||
e58|1929|The Wall Street Crash||
e59|1932|The Sydney Harbour Bridge opens||
e60|1939|World War II begins||World War II
e61|1941|The attack on Pearl Harbor||World War II
e62|1945|World War II ends||World War II
e63|1947|India gains independence||
e64|1953|Hillary and Tenzing first reach the summit of Everest||
e65|1957|Sputnik becomes the first satellite in orbit||The Space Race
e66|1961|The Berlin Wall is built||The Cold War
e67|1963|President John F. Kennedy is assassinated||
e68|1969|Humans first walk on the Moon||The Space Race
e69|1973|The Sydney Opera House opens||
e70|1989|The Berlin Wall falls||The Cold War
e71|1990|Nelson Mandela is released from prison||
e72|1991|The World Wide Web goes public||
e73|1991|The Soviet Union breaks up||
e74|2000|The Sydney Olympics||
e75|2001|The September 11 attacks||
e76|2007|The first iPhone goes on sale||
e77|2008|The global financial crisis||
e78|2019|The first photo of a black hole is published||
e79|2020|COVID-19 is declared a pandemic||
e83|1962|The Cuban Missile Crisis||The Cold War
e84|1945|Atomic bombs are dropped on Hiroshima and Nagasaki||World War II
e85|1969|The Woodstock music festival||
e95|1986|The Chernobyl nuclear disaster||
e97|1865|Abraham Lincoln is assassinated||The American Civil War
e98|1948|Mahatma Gandhi is assassinated||
e99|1914|Archduke Franz Ferdinand is assassinated||
e100|1982|The Falklands War||
e101|1942|The bombing of Darwin||World War II
e102|1975|Gough Whitlam is dismissed as prime minister||
e103|2004|The Indian Ocean tsunami||
e104|1986|The Challenger space shuttle disaster||
e106|1937|The Hindenburg airship disaster||
e107|1968|Martin Luther King Jr. is assassinated||The US Civil Rights Movement
e108|1940|The Dunkirk evacuation||World War II
e110|1955|Jonas Salk's polio vaccine is declared safe||
e112|1582|The Gregorian calendar is introduced||
e116|1957|Laika the dog is launched into space||The Space Race
e117|1618|The Defenestration of Prague||
e118|1906|The San Francisco earthquake||
e120|1692|The Salem witch trials||
e121|1953|The structure of DNA is discovered||
e122|1752|Benjamin Franklin's kite experiment||
e123|1969|ARPANET, the internet's forerunner, sends its first message||
e124|732|The Battle of Tours||
e125|1896|The first modern Olympic Games, in Athens||
e126|1998|The Good Friday Agreement is signed in Northern Ireland||
e127|1804|The first steam locomotive runs (Richard Trevithick)||
e128|1415|The Battle of Agincourt||The Hundred Years' War
e129|1926|John Logie Baird demonstrates television||
e130|1605|The Gunpowder Plot||
e131|1170|Thomas Becket is murdered in Canterbury Cathedral||
e132|1054|The Great Schism splits the Christian Church east and west||
e139|1956|The first container ship sails (shipping containers are invented)||
e140|-480|The Battle of Thermopylae||The Greco-Persian Wars
e141|1863|The Battle of Gettysburg||The American Civil War
e142|1942|The Battle of Stalingrad||World War II
e143|1944|D-Day: the Normandy landings||World War II
e144|1781|The Battle of Yorktown||The American Revolutionary War
e145|2010|The Haiti earthquake||
e146|2011|The Japan earthquake and tsunami||
e147|2010|The Deepwater Horizon oil spill||
e150|1978|The Jonestown massacre||
e151|1975|The Banqiao Dam failure||
e152|2011|The Fukushima Daiichi nuclear disaster||
e153|2020|The Beirut port explosion||
`;

// PERIOD_TABLE: id | start year | end year (blank = still going) | name | "c" if approximate | kind
// Negative years are BC. kind: "event" = a war or movement from Big Moments, "era" = an era or dynasty.
// Both kinds are shared by Big Moments (scoring "inside the right period") and Eras & Dynasties.
export const PERIOD_TABLE = `
e80|1955|1975|The Vietnam War||event
e81|1950|1953|The Korean War||event
e86|1972|1974|The Watergate scandal||event
e87|1927|1949|The Chinese Civil War|c|event
e88|1954|1968|The US Civil Rights Movement|c|event
e90|1789|1799|The French Revolution||event
e91|1979|1981|The Iran hostage crisis||event
e92|1936|1939|The Spanish Civil War||event
e93|1929|1939|The Great Depression|c|event
e96|1642|1651|The English Civil War||event
e113|1760|1840|The Industrial Revolution|c|event
e115|1096|1291|The Crusades||event
e119|1478|1834|The Spanish Inquisition||event
e133|1337|1453|The Hundred Years' War||event
e134|1455|1487|The Wars of the Roses||event
e136|1948|1994|Apartheid in South Africa||event
e137|1839|1860|The Opium Wars||event
e138|1602|1799|The Dutch East India Company||event
e154|1914|1918|World War I||event
e155|1939|1945|World War II||event
e156|1947|1991|The Cold War|c|event
e157|1955|1975|The Space Race|c|event
e158|1775|1783|The American Revolutionary War||event
e159|1861|1865|The American Civil War||event
e160|-499|-449|The Greco-Persian Wars||event
e161|-3300|-1200|The Bronze Age|c|era
e162|-510|-323|Classical Greece||era
e163|-509|-27|The Roman Republic||era
e164|-27|476|The Roman Empire||era
e165|-206|220|The Han dynasty||era
e166|320|550|The Gupta Empire|c|era
e167|330|1453|The Byzantine Empire||era
e168|618|907|The Tang dynasty||era
e169|750|1258|The Islamic Golden Age|c|era
e170|793|1066|The Viking Age||era
e171|960|1279|The Song dynasty||era
e172|1206|1368|The Mongol Empire||era
e173|1346|1353|The Black Death||era
e174|1299|1922|The Ottoman Empire||era
e175|1368|1644|The Ming dynasty||era
e176|1400|1600|The Renaissance|c|era
e177|1415|1600|The Age of Exploration|c|era
e178|1485|1603|The Tudor period||era
e179|1517|1648|The Reformation|c|era
e180|1526|1857|The Mughal Empire||era
e181|1603|1714|The Stuart period||era
e182|1603|1868|The Edo period||era
e183|1644|1912|The Qing dynasty||era
e184|1685|1815|The Enlightenment|c|era
e185|1714|1837|The Georgian era||era
e186|1837|1901|The Victorian era||era
e187|1851|1890|The Australian gold rushes|c|era
e188|1868|1912|The Meiji era||era
e189|1918|1939|The Interwar period||era
e190|1970||The Digital Age|c|era
`;
