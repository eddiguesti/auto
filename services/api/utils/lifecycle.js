/** Drain resources once, with a deadline armed before any asynchronous cleanup. */
export function createShutdown({
  stopCron,
  closeServer,
  closeSockets,
  stopQueue,
  closeDatabase,
  exit = code => process.exit(code),
  logger = console,
  timeoutMs = 10000
}) {
  let pending
  return function shutdown(signal = 'shutdown') {
    if (pending) return pending
    pending = (async () => {
      logger.log(`${signal} — draining application resources`)
      const deadline = setTimeout(() => {
        logger.error('Shutdown exceeded its deadline')
        exit(1)
      }, timeoutMs)
      deadline.unref?.()
      let failed = false
      const invoke = async callback => {
        if (!callback) return
        try {
          await callback()
        } catch (error) {
          failed = true
          logger.error('Resource cleanup failed:', error.message)
        }
      }
      try {
        await invoke(stopCron)
        await Promise.all([invoke(closeServer), invoke(closeSockets), invoke(stopQueue)])
        await invoke(closeDatabase)
      } finally {
        clearTimeout(deadline)
      }
      exit(failed ? 1 : 0)
    })()
    return pending
  }
}

export function registerShutdown(shutdown, processTarget = process) {
  const onTerm = () => void shutdown('SIGTERM')
  const onInt = () => void shutdown('SIGINT')
  processTarget.on('SIGTERM', onTerm)
  processTarget.on('SIGINT', onInt)
  return () => {
    processTarget.off('SIGTERM', onTerm)
    processTarget.off('SIGINT', onInt)
  }
}
