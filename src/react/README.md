# @sekura/react

Versioned native React components: **Button, TextField, Textarea, Select, Checkbox, Switch**. Built from this repository with `npm run build:react`; install the local `dist-react` directory or `npm pack ./dist-react`. This package is not yet published to a registry. React 18–19 is a peer dependency. Load the matching Sekura `sekura.css` separately.

```tsx
import { useState } from 'react';
import { Button, TextField } from '@sekura/react';
const [name, setName] = useState('');
<TextField label="Project name" hint="Visible to your team" error={error}
  value={name} onChange={e => setName(e.target.value)} required />
<Button busy={pending} onClick={save}>Save project</Button>
```

All controls forward native props and refs. Fields require a visible `label`, accept `hint` and `error`, generate stable IDs with `useId`, and merge external `aria-describedby` references. Provide an explicit ID when linking an external error summary. Controlled values and application outcomes belong to the application. Errors are associated descriptions; announce submission failures through one summary/live region in the form, avoiding duplicate announcements. `Button` defaults to `type="button"`; set `type="submit"` explicitly. Its `busy` prop disables activation while retaining the label; announce progress and the outcome separately. TextField `size` is `sm | md | lg`, rather than the native character count.

Checkbox and Switch use native checked/onChange semantics. They support controlled and uncontrolled use. Switch changes are local until your application persists them; implement rollback on failed requests. These six controls need no automatic enhancement. Overlay and composite widgets remain reference recipes plus the behavior package; they are not exports of this package. The public types and package version define the supported API, independently of editable MCP recipes.
