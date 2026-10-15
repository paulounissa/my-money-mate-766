<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Finance data and chat history live in browser localStorage (src/lib/finance.ts); the AI route only receives a text summary as context — user chose no accounts/cloud.
- The AI assistant's tools (register transaction, create/fund goal) have no server execute; the browser applies them in onToolCall — keeps all data client-side.
