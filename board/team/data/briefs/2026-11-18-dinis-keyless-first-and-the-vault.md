# Dinis, in data.b@'s session, 18 November 2026, about 22:25 UTC

> "Yeah, for now, only map the ones that you don't need API keys, and then keep the other ones as sort of sources that we can use in the future, if we do have the keys, right? But for now, let's just keep the ones that we can just implement. What's the decision on Open Mateo? Can you list here? Which one it is? Is that the European one? That sounds like a good source of data. And what do you need the GitHub key? What do you need that for? And what do you need Mayo? So can you just keep this in the raw history, as long as all public, should be in a vault."

## What follows (data.b@'s reading)

1. Collect only sources that need no key. Sources that need a key stay on the register as future sources ("waiting for a key"), not built.
2. Open-Meteo, the GitHub token and MEO BeachCam: Dinis asked what they are and why; answered in the session. No decision yet on each.
3. The raw history: keep it, in a vault, as long as all of it is public data. This decides the open question between CI vault secrets and an append lane: the vault. It needs the two CI secrets (SG_SEND_ACCESS_TOKEN, DATA_VAULT_KEYS) on the repository, which only Dinis can add.
