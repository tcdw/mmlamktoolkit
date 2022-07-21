# Feature List

### Syntax Highlight

- Comment (;)

- Replacement ("=")

- Sample load (("",$))

- Path (#path "")

- Illegal Loop command (\[\[\[ \]\]\])

- Samples (#samples {})

  - Sample group (#)

  - Quotation ("")

- Instruments (#instruments {})

  - Quotation ("")

  - Hex command ($)

  - Noise (n)

  - Instrument (@)

- Spc (#spc {})

  - Tag (#)

  - Quotation ("")

- Option (#option)

- Define (#define)

- Undef (#undef)

- Ifdef (#ifdef)

- Ifndef (#ifndef)

- If (#if)

- Endif (#endif)

- Error (#error)

- Any special commands (#)

- Loop recall (\*)

- Hex command ($)

- Quantization (q)

- Noise (n)

- Note (c,d,e,f,g,a,b)

- Rest (r)

- Tie (^)

- Tune (h)

- Octave (o)

- Default length (l)

- Instrument (@)

- Volume (v)

- Global volume (w)

- Pan (y)

- Tempo (t)

- Vibrato (p)

- Any number

### Semantic Highlight (Only Dark+ theme)

- Replacement call

- Hex command ($)

  - Highlight the beginning of the Hex command.

- Note (c,d,e,f,g,a,b)

  - Color-coding by octave.

- Rest (r)

- Octave (o)

  - Color-coding by octave.

### Diagnostics

- Samples (#samples {})

  - Quotation ("")

    - Check if files exist in the sample directory.

  - Sample group (#)

    - Check if it is #default or #optimized.

- Instruments (#instruments {})

  - Quotation ("")

    - Check if it is defined in #sample.

  - Instrument (@)

    - Range check (0-29)

  - Noise (n)

    - Range check (0-1F(31))

  - Hex command ($)

    - Range check (0-FF(255))

    - Check if the sample name is followed by five.

### Auto Completion

### Hover
