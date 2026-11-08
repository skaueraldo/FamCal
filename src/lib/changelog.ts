export interface ChangelogCopy {
  en: string;
  no: string;
}

export interface ChangelogEntry {
  date: string;
  items: ChangelogCopy[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-25",
    items: [
      {
        en: "Prices on the shopping list start tucked into a closed section.",
        no: "Prisene på handlelisten starter i en lukket seksjon.",
      },
      {
        en: "The shopping list also compares this week's offers at Maximat, EuroCash and Nordby Supermarket.",
        no: "Handlelisten sammenligner også ukens tilbud hos Maximat, EuroCash og Nordby Supermarket.",
      },
      {
        en: "Price comparison sits under the shopping list and loads with the items.",
        no: "Prissammenligningen ligger under handlelisten og hentes sammen med varene.",
      },
      {
        en: "The shopping list can check prices and show which grocery chain is cheapest.",
        no: "Handlelisten kan sjekke priser og vise hvilken dagligvarekjede som er billigst.",
      },
      {
        en: "Dinner can suggest a weekly menu, and those ingredients go on the shopping list sorted by food type.",
        no: "Middag kan foreslå en ukesmeny, og ingrediensene legges på handlelisten sortert etter type matvarer.",
      },
      {
        en: "You can place a single dish from any menu on a day, and save your own dishes under Favorites.",
        no: "Du kan legge én rett fra en hvilken som helst meny på en dag, og lagre egne retter under Favoritter.",
      },
      {
        en: "The shopping list groups items by food type, so apples land with fruit and vegetables and chicken or beef with meat.",
        no: "Handlelisten grupperer varer etter type, så epler havner under frukt og grønt og kylling eller biff under kjøtt.",
      },
      {
        en: "You can move a shopping item to another category when it landed in the wrong one.",
        no: "Du kan flytte en vare til en annen kategori når den har havnet feil.",
      },
      {
        en: "Shopping items can be dragged into another category.",
        no: "Varer på handlelisten kan dras over i en annen kategori.",
      },
      {
        en: "You can archive a shopping list and copy a previous one onto the current list.",
        no: "Du kan arkivere en handleliste og kopiere en tidligere liste inn på den nåværende.",
      },
      {
        en: "You can add one dish's ingredients to the shopping list from the menu, Favorites, or the day it is planned.",
        no: "Du kan legge ingrediensene fra én rett på handlelisten, fra menyen, Favoritter eller dagen den er planlagt.",
      },
      {
        en: "Weekly menu suggestions are hidden on Dinner, and Favorites sits at the top.",
        no: "Forslag til ukesmenyer er skjult under Middag, og Favoritter ligger øverst.",
      },
      {
        en: "Dish suggestions sit in a collapsed section just under Favorites.",
        no: "Forslag til retter ligger i en lukket seksjon rett under Favoritter.",
      },
      {
        en: "Favorites and both dinner weeks can be collapsed.",
        no: "Favoritter og begge middagsukene kan lukkes.",
      },
      {
        en: "The group name field follows the household you have open.",
        no: "Feltet for gruppenavn følger husstanden du har åpen.",
      },
    ],
  },
  {
    date: "2026-10-01",
    items: [
      {
        en: "Putting a to-do list in a folder starts from a small Add to folder button.",
        no: "Å legge en gjøremålsliste i en mappe starter med en liten Legg i Mappe-knapp.",
      },
      {
        en: "An empty today says Nothing today yet.",
        no: "En tom dag i dag sier Ingenting i dag ennå.",
      },
      {
        en: "Today is labeled under the date, and the weekday stays visible.",
        no: "I dag er merket under datoen, og ukedagen vises som vanlig.",
      },
      {
        en: "Event days start on today, grouped by week of the year, with a little extra space where the week changes.",
        no: "Dager for hendelser starter på i dag, gruppert etter ukenummer, med litt mer luft der uken skifter.",
      },
      {
        en: "The menu button on a phone is easier to see.",
        no: "Menyknappen på telefon er lettere å se.",
      },
      {
        en: "On a phone, the menu is a side drawer with an icon for each section.",
        no: "På telefon er menyen en skuff fra siden, med ikon for hver seksjon.",
      },
    ],
  },
  {
    date: "2026-09-29",
    items: [
      {
        en: "Lists are grouped into folders, standalone lists, and archived.",
        no: "Listene er delt i mapper, lister uten mappe og arkivert.",
      },
      {
        en: "You can open or close every list in a folder at once, and add a list from inside the folder.",
        no: "Du kan åpne eller lukke alle lister i en mappe samtidig, og legge til en liste fra mappen.",
      },
      {
        en: "You can archive a to-do, wish, or spending list and restore it later.",
        no: "Du kan arkivere en gjøremål-, ønskeliste- eller utleggsliste og hente den frem igjen.",
      },
      {
        en: "Lists in a folder stay closed until you open one.",
        no: "Lister i en mappe er lukket til du åpner en.",
      },
      {
        en: "To-do, wish, and spending lists can sit together in a folder.",
        no: "Gjøremål, ønskelister og utlegg kan samles i en mappe.",
      },
      {
        en: "Each to-do, wish, and spending list has a link you can copy or share.",
        no: "Hver gjøremål-, ønskeliste- og utleggsliste har en lenke du kan kopiere eller dele.",
      },
      {
        en: "To-do lists are in More, under Lists.",
        no: "Gjøremål ligger under Lister i Mer.",
      },
    ],
  },
  {
    date: "2026-09-28",
    items: [
      {
        en: "On a phone, the menu is Calendar, Shopping, Dinner, and More.",
        no: "På telefon er menyen Kalender, Handleliste, Middag og Mer.",
      },
      {
        en: "The Home Screen app picks up new FamCal versions when you open it again.",
        no: "Appen på Hjem-skjermen henter nye FamCal-versjoner når du åpner den igjen.",
      },
    ],
  },
  {
    date: "2026-09-26",
    items: [
      {
        en: "Member names in the calendar and lists show that person's avatar.",
        no: "Medlemsnavn i kalenderen og listene viser avataren til personen.",
      },
      {
        en: "Group members can add a profile photo to their avatar, or replace and remove it.",
        no: "Gruppemedlemmer kan legge til et profilbilde på avataren sin, eller bytte og fjerne det.",
      },
    ],
  },
  {
    date: "2026-09-25",
    items: [
      {
        en: "You can email a FamCal link and the group code from the Group page.",
        no: "Du kan sende en FamCal-lenke og gruppekoden på e-post fra Gruppesiden.",
      },
      {
        en: "Today and tomorrow show existing events apart from the form for adding a new one.",
        no: "I dag og i morgen viser eksisterende hendelser atskilt fra skjemaet for å legge til en ny.",
      },
      {
        en: "The menu stays on one row, with an accordion when more sections need space.",
        no: "Menyen holder seg på én rad, med et trekkspill når flere seksjoner trenger plass.",
      },
      {
        en: "Sections you switch off in Settings stay hidden until you switch them on again.",
        no: "Seksjoner du slår av i Innstillinger forblir skjult til du slår dem på igjen.",
      },
      {
        en: "The bottom section list wraps cleanly on smaller screens.",
        no: "Listen over seksjoner nederst vises pent på mindre skjermer.",
      },
      {
        en: "Group admins can add people by name, who can sign in later with the invite code.",
        no: "Gruppeadministratorer kan legge til folk med navn, som senere kan logge inn med invitasjonskoden.",
      },
      {
        en: "Member colors are stronger and easier to tell apart.",
        no: "Medlemsfargene er sterkere og lettere å skille fra hverandre.",
      },
      {
        en: "The Home Screen icon matches the current palette and shows FamCal plus the group name.",
        no: "Hjem-skjerm-ikonet følger fargepaletten og viser FamCal og gruppenavnet.",
      },
      {
        en: "Settings now has a changelog that lists what changed in FamCal.",
        no: "Innstillinger har nå en endringslogg som viser hva som er nytt i FamCal.",
      },
      {
        en: "Each person’s color is saved, stays on that person, and nobody else can pick it.",
        no: "Fargen til hver person lagres, blir værende på den personen, og ingen andre kan velge den.",
      },
      {
        en: "Calendar events use the assigned person’s color, so it is easy to see who they belong to.",
        no: "Kalenderhendelser bruker fargen til den som er tilordnet, så det er lett å se hvem de tilhører.",
      },
      {
        en: "Wish list and spending list names have a larger field.",
        no: "Navnefeltene for ønskelister og utlegg er større.",
      },
      {
        en: "Events, wish lists, and spendings can be assigned to a person, with that person’s color shown.",
        no: "Hendelser, ønskelister og utlegg kan tilordnes en person, og fargen til personen vises.",
      },
      {
        en: "Cleaner look with whites, greys, and pastels, and the group name as a large title.",
        no: "Renere utseende med hvitt, grått og pastell, og gruppenavnet som en stor tittel.",
      },
      {
        en: "Saved calendar events can be edited.",
        no: "Lagrede kalenderhendelser kan redigeres.",
      },
      {
        en: "To-do and spending lists, and households stay after new versions go online.",
        no: "Gjøremål og utlegg, og husstander blir værende etter at nye versjoner legges ut.",
      },
    ],
  },
  {
    date: "2026-09-13",
    items: [
      {
        en: "Calendar activities can repeat, span several days, and use a color.",
        no: "Kalenderaktiviteter kan gjentas, gå over flere dager og ha en farge.",
      },
    ],
  },
  {
    date: "2026-09-10",
    items: [
      {
        en: "People can belong to several groups and sign in with name plus invite code.",
        no: "Folk kan være med i flere grupper og logge inn med navn og invitasjonskode.",
      },
      {
        en: "Opening from the Home Screen no longer shows a blank page.",
        no: "Åpning fra Hjem-skjermen viser ikke lenger en blank side.",
      },
      {
        en: "Group invite codes stay valid after the app is redeployed.",
        no: "Invitasjonskoder til gruppen forblir gyldige etter at appen er lagt ut på nytt.",
      },
      {
        en: "The person who created the group can administer members.",
        no: "Den som opprettet gruppen kan administrere medlemmer.",
      },
    ],
  },
  {
    date: "2026-09-09",
    items: [
      {
        en: "Reminders can be turned on per section, and household data stays on this device.",
        no: "Varsler kan slås på per seksjon, og husstandsdata blir værende på denne enheten.",
      },
    ],
  },
  {
    date: "2026-09-06",
    items: [
      {
        en: "FamCal can be installed on the Home Screen, with its own icon.",
        no: "FamCal kan installeres på Hjem-skjermen, med et eget ikon.",
      },
      {
        en: "Shared household calendar and shopping list.",
        no: "Felles husstandskalender og handleliste.",
      },
    ],
  },
];
