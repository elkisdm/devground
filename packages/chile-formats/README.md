# @devground/chile-formats

Zero-dependency es-CL formatting/validation helpers: RUT (module 11), phone (+56 9), and
CLP/UF/number via `Intl.NumberFormat('es-CL')`.

## Install

```bash
pnpm add @devground/chile-formats
```

In the monorepo:

```json
{
  "dependencies": {
    "@devground/chile-formats": "workspace:*"
  }
}
```

## Usage

### RUT

```ts
import { cleanRut, computeDv, formatRut, isValidRut } from '@devground/chile-formats';

isValidRut('12.345.678-5'); // true
cleanRut('12.345.678-5'); // "123456785"
computeDv('12345678'); // "5"
formatRut('123456785'); // "12.345.678-5"
```

### Phone

```ts
import { formatPhone, normalizePhone } from '@devground/chile-formats';

formatPhone('912345678'); // "+56 9 1234 5678"
normalizePhone('+56 9 1234 5678'); // "+56912345678"
```

### Currency

```ts
import { formatCLP, formatNumber, formatUF } from '@devground/chile-formats';

formatCLP(1234567); // "$1.234.567"
formatUF(39876.54); // "UF 39.876,54"
formatNumber(1234567.89); // "1.234.567,89"
```

## License

MIT
