## Approach lights

The theme colours bracket pairs like an approach lighting system — red → amber → cyan → magenta → green → blue — and uses language-server semantic tokens for more accurate colouring. Both are off by default in VS Code.

**Enable Recommended Settings** writes three values to your user settings:

```jsonc
{
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.semanticHighlighting.enabled": true
}
```

Nothing else is changed.
