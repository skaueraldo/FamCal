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
    date: "2026-09-25",
    items: [
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
