!macro NSIS_HOOK_PREINSTALL
  StrCpy $INSTDIR "D:\MirrorApp"
  CreateDirectory "$INSTDIR"
  SetOutPath "$INSTDIR"
!macroend
