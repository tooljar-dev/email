# Where the data comes from

`domains.txt` merges five public lists. `servers.txt` and `meta.json` are made by our own script (`scripts/update-data.mjs`) from DNS lookups. Thank you to everyone who keeps these lists.

| Bit | List | License | Copyright |
|---|---|---|---|
| 1 | [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) | CC0 1.0 (public domain) | none |
| 2 | [mailchecker](https://github.com/FGRibreau/mailchecker) | MIT | Copyright (c) 2013 Francois-Guillaume Ribreau |
| 4 | [castle/disposable-email-domains](https://github.com/castle/disposable-email-domains) | MIT | Copyright (c) 2026 Castle |
| 8 | [fakefilter](https://github.com/7c/fakefilter) | BSD 3-Clause | Copyright (c) 2022, 7c |
| 16 | [burner-email-providers](https://github.com/wesbos/burner-email-providers) | MIT | Copyright 2018 Wes Bos |

In `domains.txt`, the number after each domain adds up the bits of the lists that name it. For example, `3` means lists 1 and 2.

We change the merged list in three ways:
- We drop whole public endings from the [Public Suffix List](https://publicsuffix.org/) (for example `ddns.net`).
- We drop reserved example and test names (RFC 2606, RFC 6761).
- We drop domains on our allow list (`allow.txt`): big email providers and privacy forwarding services.

The MIT and BSD licenses ask that their copyright notices travel with copies of the data. The full license texts are in each project's repository, linked above.

**BSD 3-Clause (fakefilter):** Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.

**MIT (mailchecker, castle, burner-email-providers):** Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
