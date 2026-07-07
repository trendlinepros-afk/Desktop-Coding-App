; Custom NSIS install steps for electron-builder (referenced from
; electron-builder.yml -> nsis.include).
;
; During installation, check whether Ollama is present on the machine. If it is
; not, offer to open the Ollama download page. Ollama is only required for local
; models — cloud API models work without it — so this is an optional prompt, not
; a hard requirement. If the user declines, the app itself shows a
; "missing prerequisites" notice on launch (see PrereqNotice in the renderer).

!macro customInstall
  nsExec::ExecToStack 'where ollama'
  Pop $0 ; exit code: "0" when found
  StrCmp $0 "0" ollama_present 0
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Ollama was not detected on this PC.$\n$\nOllama is required to run local AI models (cloud API models still work without it).$\n$\nOpen the Ollama download page now?" \
      IDNO ollama_present
    ExecShell "open" "https://ollama.com/download"
  ollama_present:
!macroend
