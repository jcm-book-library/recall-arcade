// born | died | name | who they were | "c" if the dates are approximate | "f" if in the Famous Faces starter
// Negative years are BC. Weighted towards before 1900.
export const PEOPLE_TABLE = `
-1810|-1750|Hammurabi|King of Babylon who wrote down a code of laws|c|
-1303|-1213|Ramesses II|Egypt's most powerful pharaoh|c|
-1341|-1323|Tutankhamun|The boy pharaoh whose tomb was found intact|c|
-563|-483|Siddhartha Gautama|The Buddha|c|
-551|-479|Confucius|Chinese philosopher|c|
-470|-399|Socrates|Athenian philosopher, sentenced to death|c|
-428|-348|Plato|Philosopher, student of Socrates|c|
-384|-322|Aristotle|Philosopher, tutor to Alexander the Great||
-356|-323|Alexander the Great|Macedonian king who conquered Persia||f
-287|-212|Archimedes|Greek mathematician and inventor|c|
-259|-210|Qin Shi Huang|First emperor of a united China||
-247|-183|Hannibal|Carthaginian general who crossed the Alps with elephants|c|
-100|-44|Julius Caesar|Roman general and dictator||f
-69|-30|Cleopatra|Last active ruler of Ptolemaic Egypt||f
-63|14|Augustus|The first Roman emperor||
-4|30|Jesus of Nazareth|Founder figure of Christianity|c|
37|68|Nero|Roman emperor||
121|180|Marcus Aurelius|Roman emperor and Stoic philosopher||
272|337|Constantine the Great|Roman emperor who moved the capital to Constantinople|c|
406|453|Attila the Hun|Leader of the Huns|c|
570|632|Muhammad|Founder of Islam|c|
747|814|Charlemagne|King of the Franks, crowned emperor in 800|c|
849|899|Alfred the Great|King of the Anglo-Saxons||
1028|1087|William the Conqueror|Norman duke who conquered England|c|
1162|1227|Genghis Khan|Founder of the Mongol Empire|c|f
1254|1324|Marco Polo|Venetian merchant who travelled to China||
1412|1431|Joan of Arc|French heroine burned at the stake|c|
1400|1468|Johannes Gutenberg|Inventor of the printing press in Europe|c|
1452|1519|Leonardo da Vinci|Painter of the Mona Lisa, inventor||f
1451|1506|Christopher Columbus|Explorer who reached the Americas|c|f
1475|1564|Michelangelo|Painter of the Sistine Chapel ceiling||
1473|1543|Nicolaus Copernicus|Astronomer who put the Sun at the centre||
1483|1546|Martin Luther|Started the Protestant Reformation||
1491|1547|Henry VIII|English king with six wives||f
1494|1566|Suleiman the Magnificent|Ottoman sultan||
1533|1603|Elizabeth I|Queen of England||
1564|1616|William Shakespeare|Playwright||f
1564|1642|Galileo Galilei|Astronomer who turned a telescope on the sky||
1638|1715|Louis XIV|The "Sun King" of France||
1643|1727|Isaac Newton|Physicist who described gravity||f
1672|1725|Peter the Great|Tsar who modernised Russia||
1685|1750|Johann Sebastian Bach|Composer||
1728|1779|James Cook|Navigator who charted Australia's east coast||
1732|1799|George Washington|First US president||
1738|1814|Arthur Phillip|First Governor of New South Wales||
1756|1791|Wolfgang Amadeus Mozart|Composer||f
1769|1821|Napoleon Bonaparte|French emperor||f
1770|1827|Ludwig van Beethoven|Composer, deaf in later life||
1775|1817|Jane Austen|Novelist, Pride and Prejudice||
1783|1830|Simón Bolívar|Led South American independence||
1809|1882|Charles Darwin|Naturalist, theory of evolution||f
1809|1865|Abraham Lincoln|US president during the Civil War||
1812|1870|Charles Dickens|Novelist, Oliver Twist||
1818|1883|Karl Marx|Philosopher, The Communist Manifesto||
1819|1901|Queen Victoria|British queen for 63 years||f
1820|1910|Florence Nightingale|Founder of modern nursing||
1847|1931|Thomas Edison|Inventor of the phonograph||
1853|1890|Vincent van Gogh|Painter, The Starry Night||
1854|1880|Ned Kelly|Australian bushranger||
1856|1943|Nikola Tesla|Inventor, alternating current||
1867|1934|Marie Curie|Physicist, first person with two Nobel Prizes||
1869|1948|Mahatma Gandhi|Led India's independence movement||
1874|1965|Winston Churchill|British wartime prime minister||
1879|1955|Albert Einstein|Physicist, theory of relativity||f
1881|1973|Pablo Picasso|Painter, co-founder of Cubism||
1897|1937|Amelia Earhart|Aviator who vanished over the Pacific||
1907|1954|Frida Kahlo|Mexican painter||
1908|2001|Don Bradman|Cricketer, Test average of 99.94||
1918|2013|Nelson Mandela|South Africa's first Black president||f
1926|2022|Queen Elizabeth II|British queen for 70 years||
1929|1968|Martin Luther King Jr.|US civil rights leader||
1930|2012|Neil Armstrong|First person to walk on the Moon||
1935|1977|Elvis Presley|Singer, "the King of Rock and Roll"||
1940|1980|John Lennon|Musician, The Beatles||
1942|2018|Stephen Hawking|Physicist, black holes||
1955|2011|Steve Jobs|Co-founder of Apple||
1815|1898|Otto von Bismarck|First chancellor of a united Germany||
1863|1947|Henry Ford|Car maker who brought in the moving assembly line||
1542|1587|Mary, Queen of Scots|Scottish queen executed by Elizabeth I||
1929|1945|Anne Frank|Jewish girl whose wartime diary became famous||
1961|1997|Diana, Princess of Wales|Princess known for her charity work||
1888|1946|John Logie Baird|Scottish inventor who demonstrated television||
1570|1606|Guy Fawkes|Plotter in the Gunpowder Plot||
1913|2005|Rosa Parks|Civil rights activist, Montgomery bus boycott||
1835|1909|Leopold II|King of the Belgians, cruel ruler of the Congo Free State||
1908|1974|Oskar Schindler|Saved about 1,200 Jewish workers in WWII||
1889|1977|Charlie Chaplin|Silent film star, the Tramp||
1822|1895|Louis Pasteur|Proved germ theory, invented pasteurisation||
1280|1337|Mansa Musa|Ruler of Mali, said to be the richest person ever|c|
-325|-265|Euclid|Greek mathematician, the father of geometry|c|
1791|1867|Michael Faraday|Scientist of electricity and magnetism||
1867|1912|Wilbur Wright|Aviation pioneer, first powered flight||
1871|1948|Orville Wright|Aviation pioneer, flew the first powered flight||
1723|1790|Adam Smith|Economist, The Wealth of Nations||
1599|1658|Oliver Cromwell|Led England as Lord Protector after the Civil War||
1847|1922|Alexander Graham Bell|Inventor of the telephone||
1743|1826|Thomas Jefferson|Wrote the Declaration of Independence, 3rd US president||
1878|1953|Joseph Stalin|Soviet dictator||
1856|1939|Sigmund Freud|Founder of psychoanalysis||
1870|1924|Vladimir Lenin|Led the Russian Revolution, founded the Soviet Union||
1893|1976|Mao Zedong|Founder of the People's Republic of China||
1480|1521|Ferdinand Magellan|Led the first voyage around the world (died on the way)|c|
30|61|Boudica|British queen who rebelled against Rome|c|
1122|1204|Eleanor of Aquitaine|Queen of France, then of England|c|
1157|1199|Richard I|King of England, the Lionheart, a crusader||
1428|1477|Vlad the Impaler|Prince of Wallachia, the inspiration for Dracula|c|
1452|1485|Richard III|Last Plantagenet king of England||
1485|1536|Catherine of Aragon|First wife of Henry VIII||
1540|1596|Francis Drake|Sailor and privateer, sailed around the world|c|
1485|1540|Thomas Cromwell|Henry VIII's chief minister|c|
1729|1796|Catherine the Great|Empress of Russia||
1755|1793|Marie Antoinette|Queen of France, executed in the Revolution||
1755|1804|Alexander Hamilton|US founding father, first Treasury Secretary|c|
1758|1805|Horatio Nelson|British admiral, won at Trafalgar||
1831|1890|Sitting Bull|Lakota leader at the Battle of the Little Bighorn|c|
1868|1918|Tsar Nicholas II|Last tsar of Russia||
1869|1916|Grigori Rasputin|Mystic at the Russian royal court||
1912|1954|Alan Turing|Codebreaker and father of computer science||
50|121|Cai Lun|Chinese court official credited with inventing paper|c|
1749|1823|Edward Jenner|Created the first vaccine (smallpox)||
1832|1898|Lewis Carroll|Author of Alice's Adventures in Wonderland||
1926|2016|Fidel Castro|Led the Cuban Revolution, ruled Cuba||
1901|1966|Walt Disney|Animator, created Mickey Mouse||
1802|1870|Alexandre Dumas|Author of The Three Musketeers||
1934|1968|Yuri Gagarin|First person in space||
1928|1967|Che Guevara|Revolutionary in the Cuban Revolution||
1899|1961|Ernest Hemingway|Author of The Old Man and the Sea||
1902|1968|John Steinbeck|Author of The Grapes of Wrath||
1874|1926|Harry Houdini|Escape artist and magician||
1802|1885|Victor Hugo|Author of Les Misérables||
1937|2006|Saddam Hussein|Dictator of Iraq||
1880|1968|Helen Keller|Deafblind author and activist||
1881|1938|Mustafa Kemal Atatürk|Founder of modern Turkey||
1608|1674|John Milton|Poet, Paradise Lost||
1840|1926|Claude Monet|Impressionist painter, Water Lilies||
1833|1896|Alfred Nobel|Invented dynamite, founded the Nobel Prizes||
1829|1902|Levi Strauss|Made the first blue jeans||
1828|1910|Leo Tolstoy|Author of War and Peace||
1892|1973|J. R. R. Tolkien|Author of The Lord of the Rings||
1898|1963|C. S. Lewis|Author of The Chronicles of Narnia||
1835|1910|Mark Twain|Author of The Adventures of Tom Sawyer||
1931|2021|Desmond Tutu|Archbishop who fought apartheid||
1854|1900|Oscar Wilde|Playwright, The Importance of Being Earnest||
1460|1524|Vasco da Gama|First to sail from Europe to India|c|
1336|1405|Timur|Founder of the Timurid Empire, also called Tamerlane||
`;
