// code | city | airport name | country | region | lat | lon | other accepted answers
// Regions: AP Australia & Pacific, AS Asia, EU Europe, AM Americas, ME Middle East & Africa.
// Coordinates are approximate, for placing the dot on the map.
export const AIRPORT_TABLE = `
SYD|Sydney|Kingsford Smith|Australia|AP|-33.95|151.18|
MEL|Melbourne|Tullamarine|Australia|AP|-37.67|144.84|
BNE|Brisbane|Brisbane|Australia|AP|-27.38|153.12|
PER|Perth|Perth|Australia|AP|-31.94|115.97|
ADL|Adelaide|Adelaide|Australia|AP|-34.95|138.53|
CBR|Canberra|Canberra|Australia|AP|-35.31|149.19|
OOL|Gold Coast|Coolangatta|Australia|AP|-28.16|153.50|
CNS|Cairns|Cairns|Australia|AP|-16.88|145.75|
HBA|Hobart|Hobart|Australia|AP|-42.84|147.51|
DRW|Darwin|Darwin|Australia|AP|-12.41|130.88|
AVV|Avalon|Avalon|Australia|AP|-38.04|144.47|Melbourne Avalon;Geelong
NTL|Newcastle|Williamtown|Australia|AP|-32.79|151.83|
TSV|Townsville|Townsville|Australia|AP|-19.25|146.77|
LST|Launceston|Launceston|Australia|AP|-41.55|147.21|
ASP|Alice Springs|Alice Springs|Australia|AP|-23.81|133.90|
AYQ|Uluru|Ayers Rock|Australia|AP|-25.19|130.98|Yulara
AKL|Auckland|Auckland|New Zealand|AP|-37.01|174.79|
WLG|Wellington|Wellington|New Zealand|AP|-41.33|174.81|
CHC|Christchurch|Christchurch|New Zealand|AP|-43.49|172.53|
ZQN|Queenstown|Queenstown|New Zealand|AP|-45.02|168.74|
NAN|Nadi|Nadi|Fiji|AP|-17.76|177.44|Fiji
NOU|Nouméa|La Tontouta|New Caledonia|AP|-22.01|166.21|Noumea;New Caledonia
PPT|Papeete|Faa'a|French Polynesia|AP|-17.55|-149.61|Tahiti
SIN|Singapore|Changi|Singapore|AS|1.36|103.99|
HKG|Hong Kong|Chek Lap Kok|Hong Kong|AS|22.31|113.92|
HND|Tokyo|Haneda|Japan|AS|35.55|139.78|
NRT|Tokyo|Narita|Japan|AS|35.77|140.39|
KIX|Osaka|Kansai|Japan|AS|34.43|135.24|
ICN|Seoul|Incheon|South Korea|AS|37.46|126.44|
PEK|Beijing|Capital|China|AS|40.08|116.58|
PKX|Beijing|Daxing|China|AS|39.51|116.41|
PVG|Shanghai|Pudong|China|AS|31.14|121.81|
CAN|Guangzhou|Baiyun|China|AS|23.39|113.30|Canton
TPE|Taipei|Taoyuan|Taiwan|AS|25.08|121.23|
BKK|Bangkok|Suvarnabhumi|Thailand|AS|13.69|100.75|
HKT|Phuket|Phuket|Thailand|AS|8.11|98.32|
KUL|Kuala Lumpur|KLIA|Malaysia|AS|2.75|101.71|
CGK|Jakarta|Soekarno-Hatta|Indonesia|AS|-6.13|106.66|
DPS|Denpasar|Ngurah Rai|Indonesia|AS|-8.75|115.17|Bali
MNL|Manila|Ninoy Aquino|Philippines|AS|14.51|121.02|
SGN|Ho Chi Minh City|Tan Son Nhat|Vietnam|AS|10.82|106.65|Saigon
HAN|Hanoi|Noi Bai|Vietnam|AS|21.22|105.81|
DEL|Delhi|Indira Gandhi|India|AS|28.56|77.10|New Delhi
BOM|Mumbai|Chhatrapati Shivaji Maharaj|India|AS|19.09|72.87|Bombay
BLR|Bengaluru|Kempegowda|India|AS|13.20|77.71|Bangalore
CMB|Colombo|Bandaranaike|Sri Lanka|AS|7.18|79.88|
MLE|Malé|Velana|Maldives|AS|4.19|73.53|Male;Maldives
KTM|Kathmandu|Tribhuvan|Nepal|AS|27.70|85.36|
LHR|London|Heathrow|United Kingdom|EU|51.47|-0.45|
LGW|London|Gatwick|United Kingdom|EU|51.15|-0.19|
STN|London|Stansted|United Kingdom|EU|51.89|0.24|
MAN|Manchester|Manchester|United Kingdom|EU|53.35|-2.27|
EDI|Edinburgh|Edinburgh|United Kingdom|EU|55.95|-3.36|
DUB|Dublin|Dublin|Ireland|EU|53.43|-6.25|
CDG|Paris|Charles de Gaulle|France|EU|49.01|2.55|Roissy
ORY|Paris|Orly|France|EU|48.72|2.38|
AMS|Amsterdam|Schiphol|Netherlands|EU|52.31|4.76|
FRA|Frankfurt|Frankfurt|Germany|EU|50.04|8.56|
MUC|Munich|Munich|Germany|EU|48.35|11.79|München
BER|Berlin|Brandenburg|Germany|EU|52.37|13.50|
ZRH|Zurich|Zurich|Switzerland|EU|47.46|8.55|Zürich
GVA|Geneva|Geneva|Switzerland|EU|46.24|6.11|
VIE|Vienna|Vienna|Austria|EU|48.11|16.57|Wien
BCN|Barcelona|El Prat|Spain|EU|41.30|2.08|
MAD|Madrid|Barajas|Spain|EU|40.47|-3.56|
LIS|Lisbon|Humberto Delgado|Portugal|EU|38.77|-9.13|Lisboa
FCO|Rome|Fiumicino|Italy|EU|41.80|12.25|Leonardo da Vinci
MXP|Milan|Malpensa|Italy|EU|45.63|8.72|
ATH|Athens|Athens|Greece|EU|37.94|23.94|
IST|Istanbul|Istanbul|Türkiye|EU|41.26|28.74|
CPH|Copenhagen|Kastrup|Denmark|EU|55.62|12.66|
ARN|Stockholm|Arlanda|Sweden|EU|59.65|17.92|
OSL|Oslo|Gardermoen|Norway|EU|60.19|11.10|
HEL|Helsinki|Helsinki-Vantaa|Finland|EU|60.32|24.96|
KEF|Reykjavík|Keflavík|Iceland|EU|63.98|-22.61|Keflavik
PRG|Prague|Václav Havel|Czechia|EU|50.10|14.26|
WAW|Warsaw|Chopin|Poland|EU|52.17|20.97|
BRU|Brussels|Brussels|Belgium|EU|50.90|4.48|
ATL|Atlanta|Hartsfield-Jackson|United States|AM|33.64|-84.43|
LAX|Los Angeles|Los Angeles|United States|AM|33.94|-118.41|LA
ORD|Chicago|O'Hare|United States|AM|41.97|-87.91|
DFW|Dallas|Dallas/Fort Worth|United States|AM|32.90|-97.04|Fort Worth;Dallas Fort Worth
DEN|Denver|Denver|United States|AM|39.86|-104.67|
JFK|New York|John F. Kennedy|United States|AM|40.64|-73.78|Kennedy;JFK
EWR|Newark|Newark Liberty|United States|AM|40.69|-74.17|New York
SFO|San Francisco|San Francisco|United States|AM|37.62|-122.38|
SEA|Seattle|Seattle-Tacoma|United States|AM|47.45|-122.31|Sea-Tac;Tacoma
LAS|Las Vegas|Harry Reid|United States|AM|36.08|-115.15|Vegas
MIA|Miami|Miami|United States|AM|25.80|-80.29|
MCO|Orlando|Orlando|United States|AM|28.43|-81.31|
BOS|Boston|Logan|United States|AM|42.36|-71.01|
IAD|Washington|Dulles|United States|AM|38.95|-77.46|Washington DC
HNL|Honolulu|Daniel K. Inouye|United States|AM|21.32|-157.92|Hawaii
YYZ|Toronto|Pearson|Canada|AM|43.68|-79.63|
YVR|Vancouver|Vancouver|Canada|AM|49.19|-123.18|
YUL|Montreal|Trudeau|Canada|AM|45.47|-73.74|Montréal
MEX|Mexico City|Benito Juárez|Mexico|AM|19.44|-99.07|
CUN|Cancún|Cancún|Mexico|AM|21.04|-86.87|Cancun
PTY|Panama City|Tocumen|Panama|AM|9.07|-79.38|Panama
BOG|Bogotá|El Dorado|Colombia|AM|4.70|-74.15|Bogota
LIM|Lima|Jorge Chávez|Peru|AM|-12.02|-77.11|
GRU|São Paulo|Guarulhos|Brazil|AM|-23.43|-46.47|Sao Paulo
GIG|Rio de Janeiro|Galeão|Brazil|AM|-22.81|-43.25|Rio;Galeao
EZE|Buenos Aires|Ezeiza|Argentina|AM|-34.82|-58.54|
SCL|Santiago|Arturo Merino Benítez|Chile|AM|-33.39|-70.79|
DXB|Dubai|Dubai International|United Arab Emirates|ME|25.25|55.36|
AUH|Abu Dhabi|Zayed|United Arab Emirates|ME|24.43|54.65|
DOH|Doha|Hamad|Qatar|ME|25.27|51.61|
RUH|Riyadh|King Khalid|Saudi Arabia|ME|24.96|46.70|
JED|Jeddah|King Abdulaziz|Saudi Arabia|ME|21.68|39.16|Jedda
AMM|Amman|Queen Alia|Jordan|ME|31.72|35.99|
TLV|Tel Aviv|Ben Gurion|Israel|ME|32.01|34.89|
CAI|Cairo|Cairo|Egypt|ME|30.12|31.41|
JNB|Johannesburg|O. R. Tambo|South Africa|ME|-26.14|28.25|Joburg
CPT|Cape Town|Cape Town|South Africa|ME|-33.97|18.60|
NBO|Nairobi|Jomo Kenyatta|Kenya|ME|-1.32|36.93|
ADD|Addis Ababa|Bole|Ethiopia|ME|8.98|38.80|
CMN|Casablanca|Mohammed V|Morocco|ME|33.37|-7.59|
LOS|Lagos|Murtala Muhammed|Nigeria|ME|6.58|3.32|
ACC|Accra|Kotoka|Ghana|ME|5.61|-0.17|
MRU|Mauritius|Sir Seewoosagur Ramgoolam|Mauritius|ME|-20.43|57.68|Port Louis
`;

/** The 20 big hubs used for the starter round. */
export const HUBS = ["ATL", "LAX", "JFK", "ORD", "LHR", "CDG", "FRA", "AMS", "IST", "DXB", "DOH", "SIN", "HKG", "HND", "ICN", "PEK", "BKK", "DEL", "SYD", "MEL"];
