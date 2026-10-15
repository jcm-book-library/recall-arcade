// One line per map shape:  map name | display name | regions | type | other accepted spellings
// Regions: AF Africa, AS Asia, EU Europe, NA North America (incl. Central America
// & Caribbean), SA South America, OC Oceania. Transcontinental countries list both.
// Types: s = sovereign country (the 197), t = territory / dependency (bonus),
//        x = disputed or uninhabited area shown on the map but never asked.
export const COUNTRY_TABLE = `
Afghanistan|Afghanistan|AS|s
Albania|Albania|EU|s
Algeria|Algeria|AF|s
American Samoa|American Samoa|OC|t
Andorra|Andorra|EU|s
Angola|Angola|AF|s
Anguilla|Anguilla|NA|t
Antigua and Barb.|Antigua & Barbuda|NA|s|Antigua and Barbuda;Antigua
Argentina|Argentina|SA|s
Armenia|Armenia|AS,EU|s
Aruba|Aruba|NA|t
Ashmore and Cartier Is.|Ashmore & Cartier Islands|OC|x
Australia|Australia|OC|s|Oz
Austria|Austria|EU|s
Azerbaijan|Azerbaijan|AS,EU|s
Bahamas|Bahamas|NA|s
Bahrain|Bahrain|AS|s
Bangladesh|Bangladesh|AS|s
Barbados|Barbados|NA|s
Belarus|Belarus|EU|s|Byelorussia
Belgium|Belgium|EU|s
Belize|Belize|NA|s
Benin|Benin|AF|s
Bermuda|Bermuda|NA|t
Bhutan|Bhutan|AS|s
Bolivia|Bolivia|SA|s
Bosnia and Herz.|Bosnia & Herzegovina|EU|s|Bosnia and Herzegovina;Bosnia;Bosnia Herzegovina
Botswana|Botswana|AF|s
Br. Indian Ocean Ter.|British Indian Ocean Territory|AS|t|Chagos Islands;Chagos;BIOT
Brazil|Brazil|SA|s|Brasil
British Virgin Is.|British Virgin Islands|NA|t|BVI
Brunei|Brunei|AS|s|Brunei Darussalam
Bulgaria|Bulgaria|EU|s
Burkina Faso|Burkina Faso|AF|s
Burundi|Burundi|AF|s
Cabo Verde|Cape Verde|AF|s|Cabo Verde
Cambodia|Cambodia|AS|s|Kampuchea
Cameroon|Cameroon|AF|s
Canada|Canada|NA|s
Cayman Is.|Cayman Islands|NA|t|Caymans
Central African Rep.|Central African Republic|AF|s|CAR
Chad|Chad|AF|s
Chile|Chile|SA|s
China|China|AS|s|PRC;People's Republic of China
Colombia|Colombia|SA|s
Comoros|Comoros|AF|s
Congo|Republic of the Congo|AF|s|Congo;Congo Brazzaville;Republic of Congo
Cook Is.|Cook Islands|OC|t
Costa Rica|Costa Rica|NA|s
Côte d'Ivoire|Côte d'Ivoire|AF|s|Ivory Coast;Cote dIvoire
Croatia|Croatia|EU|s
Cuba|Cuba|NA|s
Curaçao|Curaçao|NA|t
Cyprus|Cyprus|EU,AS|s
Czechia|Czechia|EU|s|Czech Republic
Dem. Rep. Congo|DR Congo|AF|s|Democratic Republic of the Congo;Democratic Republic of Congo;DRC;Congo Kinshasa;Zaire
Denmark|Denmark|EU|s
Djibouti|Djibouti|AF|s
Dominica|Dominica|NA|s
Dominican Rep.|Dominican Republic|NA|s
Ecuador|Ecuador|SA|s
Egypt|Egypt|AF|s
El Salvador|El Salvador|NA|s|Salvador
Eq. Guinea|Equatorial Guinea|AF|s
Eritrea|Eritrea|AF|s
Estonia|Estonia|EU|s
eSwatini|Eswatini|AF|s|Swaziland
Ethiopia|Ethiopia|AF|s
Faeroe Is.|Faroe Islands|EU|t|Faroes;Faeroe Islands
Falkland Is.|Falkland Islands|SA|t|Falklands;Malvinas;Islas Malvinas
Fiji|Fiji|OC|s
Finland|Finland|EU|s
Fr. Polynesia|French Polynesia|OC|t|Tahiti
Fr. S. Antarctic Lands|French Southern Territories|AF|t|French Southern and Antarctic Lands;Kerguelen;TAAF
France|France|EU|s
Gabon|Gabon|AF|s
Gambia|Gambia|AF|s
Georgia|Georgia|AS,EU|s
Germany|Germany|EU|s|Deutschland
Ghana|Ghana|AF|s
Greece|Greece|EU|s|Hellas
Greenland|Greenland|NA|t|Kalaallit Nunaat
Grenada|Grenada|NA|s
Guam|Guam|OC|t
Guatemala|Guatemala|NA|s
Guernsey|Guernsey|EU|t
Guinea|Guinea|AF|s
Guinea-Bissau|Guinea-Bissau|AF|s
Guyana|Guyana|SA|s
Haiti|Haiti|NA|s
Heard I. and McDonald Is.|Heard & McDonald Islands|OC|t|Heard Island;Heard Island and McDonald Islands
Honduras|Honduras|NA|s
Hong Kong|Hong Kong|AS|t
Hungary|Hungary|EU|s
Iceland|Iceland|EU|s
India|India|AS|s
Indian Ocean Ter.|Christmas & Cocos Islands|OC|x
Indonesia|Indonesia|AS|s
Iran|Iran|AS|s|Persia
Iraq|Iraq|AS|s
Ireland|Ireland|EU|s|Eire;Republic of Ireland
Isle of Man|Isle of Man|EU|t
Israel|Israel|AS|s
Italy|Italy|EU|s
Jamaica|Jamaica|NA|s
Japan|Japan|AS|s|Nippon
Jersey|Jersey|EU|t
Jordan|Jordan|AS|s
Kazakhstan|Kazakhstan|AS|s
Kenya|Kenya|AF|s
Kiribati|Kiribati|OC|s
Kosovo|Kosovo|EU|s
Kuwait|Kuwait|AS|s
Kyrgyzstan|Kyrgyzstan|AS|s|Kyrgyz Republic;Kirghizia
Laos|Laos|AS|s|Lao
Latvia|Latvia|EU|s
Lebanon|Lebanon|AS|s
Lesotho|Lesotho|AF|s
Liberia|Liberia|AF|s
Libya|Libya|AF|s
Liechtenstein|Liechtenstein|EU|s
Lithuania|Lithuania|EU|s
Luxembourg|Luxembourg|EU|s
Macao|Macau|AS|t|Macao
Macedonia|North Macedonia|EU|s|Macedonia
Madagascar|Madagascar|AF|s
Malawi|Malawi|AF|s
Malaysia|Malaysia|AS|s
Maldives|Maldives|AS|s
Mali|Mali|AF|s
Malta|Malta|EU|s
Marshall Is.|Marshall Islands|OC|s
Mauritania|Mauritania|AF|s
Mauritius|Mauritius|AF|s
Mexico|Mexico|NA|s
Micronesia|Micronesia|OC|s|Federated States of Micronesia;FSM
Moldova|Moldova|EU|s
Monaco|Monaco|EU|s
Mongolia|Mongolia|AS|s
Montenegro|Montenegro|EU|s
Montserrat|Montserrat|NA|t
Morocco|Morocco|AF|s
Mozambique|Mozambique|AF|s
Myanmar|Myanmar|AS|s|Burma
N. Cyprus|Northern Cyprus|EU|x
N. Mariana Is.|Northern Mariana Islands|OC|t|Northern Marianas;CNMI
Namibia|Namibia|AF|s
Nauru|Nauru|OC|s
Nepal|Nepal|AS|s
Netherlands|Netherlands|EU|s|Holland
New Caledonia|New Caledonia|OC|t|Kanaky
New Zealand|New Zealand|OC|s|Aotearoa;NZ
Nicaragua|Nicaragua|NA|s
Niger|Niger|AF|s
Nigeria|Nigeria|AF|s
Niue|Niue|OC|t
Norfolk Island|Norfolk Island|OC|t
North Korea|North Korea|AS|s|DPRK;N Korea;Korea North
Norway|Norway|EU|s
Oman|Oman|AS|s
Pakistan|Pakistan|AS|s
Palau|Palau|OC|s
Palestine|Palestine|AS|s|State of Palestine;Palestinian Territories
Panama|Panama|NA|s
Papua New Guinea|Papua New Guinea|OC|s|PNG
Paraguay|Paraguay|SA|s
Peru|Peru|SA|s
Philippines|Philippines|AS|s
Pitcairn Is.|Pitcairn Islands|OC|t|Pitcairn
Poland|Poland|EU|s
Portugal|Portugal|EU|s
Puerto Rico|Puerto Rico|NA|t
Qatar|Qatar|AS|s
Romania|Romania|EU|s
Russia|Russia|EU,AS|s|Russian Federation
Rwanda|Rwanda|AF|s
S. Geo. and the Is.|South Georgia & South Sandwich Islands|SA|t|South Georgia;South Georgia and the South Sandwich Islands
S. Sudan|South Sudan|AF|s
Saint Helena|Saint Helena|AF|t|Saint Helena Ascension and Tristan da Cunha
Saint Lucia|Saint Lucia|NA|s
Samoa|Samoa|OC|s
San Marino|San Marino|EU|s
São Tomé and Principe|São Tomé & Príncipe|AF|s|Sao Tome and Principe;Sao Tome
Saudi Arabia|Saudi Arabia|AS|s|KSA
Senegal|Senegal|AF|s
Serbia|Serbia|EU|s
Seychelles|Seychelles|AF|s
Siachen Glacier|Siachen Glacier|AS|x
Sierra Leone|Sierra Leone|AF|s
Singapore|Singapore|AS|s
Sint Maarten|Sint Maarten|NA|t
Slovakia|Slovakia|EU|s
Slovenia|Slovenia|EU|s
Solomon Is.|Solomon Islands|OC|s|Solomons
Somalia|Somalia|AF|s
Somaliland|Somaliland|AF|x
South Africa|South Africa|AF|s|RSA
South Korea|South Korea|AS|s|Republic of Korea;S Korea;Korea South
Spain|Spain|EU|s|Espana
Sri Lanka|Sri Lanka|AS|s|Ceylon
St-Barthélemy|Saint Barthélemy|NA|t|St Barts;St Barths
St-Martin|Saint Martin|NA|t
St. Kitts and Nevis|Saint Kitts & Nevis|NA|s|Saint Kitts and Nevis;Saint Christopher and Nevis;Saint Kitts
St. Pierre and Miquelon|Saint Pierre & Miquelon|NA|t|Saint Pierre and Miquelon;Saint Pierre
St. Vin. and Gren.|Saint Vincent & the Grenadines|NA|s|Saint Vincent and the Grenadines;Saint Vincent
Sudan|Sudan|AF|s
Suriname|Suriname|SA|s|Surinam
Sweden|Sweden|EU|s
Switzerland|Switzerland|EU|s
Syria|Syria|AS|s
Taiwan|Taiwan|AS|s|Republic of China
Tajikistan|Tajikistan|AS|s
Tanzania|Tanzania|AF|s
Thailand|Thailand|AS|s|Siam
Timor-Leste|Timor-Leste|AS|s|East Timor
Togo|Togo|AF|s
Tonga|Tonga|OC|s
Trinidad and Tobago|Trinidad & Tobago|NA|s|Trinidad and Tobago;Trinidad
Tunisia|Tunisia|AF|s
Turkey|Türkiye|AS,EU|s|Turkey
Turkmenistan|Turkmenistan|AS|s
Turks and Caicos Is.|Turks & Caicos Islands|NA|t|Turks and Caicos
Tuvalu|Tuvalu|OC|s
U.S. Virgin Is.|US Virgin Islands|NA|t|United States Virgin Islands;USVI
Uganda|Uganda|AF|s
Ukraine|Ukraine|EU|s
United Arab Emirates|United Arab Emirates|AS|s|UAE;Emirates
United Kingdom|United Kingdom|EU|s|UK;Great Britain;Britain
United States of America|United States|NA|s|United States of America;USA;US;America
Uruguay|Uruguay|SA|s
Uzbekistan|Uzbekistan|AS|s
Vanuatu|Vanuatu|OC|s
Vatican|Vatican City|EU|s|Vatican;Holy See
Venezuela|Venezuela|SA|s
Vietnam|Vietnam|AS|s|Viet Nam
W. Sahara|Western Sahara|AF|t|Sahrawi Republic;SADR
Wallis and Futuna Is.|Wallis & Futuna|OC|t|Wallis and Futuna
Yemen|Yemen|AS|s
Zambia|Zambia|AF|s
Zimbabwe|Zimbabwe|AF|s
Åland|Åland Islands|EU|t|Aland
`;

/** Places too small to appear in the map data, drawn as a dot at [lon, lat]. */
export const EXTRA_POINTS: Record<string, [number, number]> = {
  Tuvalu: [179.2, -8.5],
};
