export function configuredEditorOrigin(request, env = {}) {
  return env.EDITOR_ORIGIN || new URL(request.url).origin
}

export function applicationDomain(request, env = {}, defaultDomain = "built.at") {
  const requestHostname = new URL(request.url).hostname.toLowerCase()
  const editorHostname = new URL(configuredEditorOrigin(request, env)).hostname.toLowerCase()
  return requestHostname === editorHostname ? defaultDomain : requestHostname.replace(/^www\./, "")
}
