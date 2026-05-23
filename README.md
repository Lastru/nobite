# NoBite

PWA locale per monitorare onicofagia.

## Logica
- Grigio: giorno non compilato.
- Verde: 0 dita selezionate.
- Giallo: 1 dito selezionato.
- Rosso: 2+ dita selezionate.
- Reset su un giorno: cancella il log e torna grigio.
- Streak dito: giorni consecutivi compilati in cui quel dito non è stato mangiato.
- Record dito: migliore streak storica del singolo dito.
- Streak generale: minimo tra le streak correnti delle dita.
- Record generale: migliore serie storica di giorni verdi consecutivi.

## Dati
I dati sono salvati solo in locale con IndexedDB.
