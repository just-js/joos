
const bindings = ['core', 'bestlines', 'fsmount']
const libs = ['lib/repl.js', 'lib/ansi.js', 'lib/proc.js', 'lib/path.js', 'lib/stringify.js']
const embeds = []

const target = 'init'
const opt = '-O3 -march=native -mtune=native'

const v8_opts = {
  v8_cleanup: 0, v8_threads: 1, on_exit: 0,
  v8flags: '--lite-mode --jitless --single-threaded --disable-write-barriers --no-verify-heap --no-expose-wasm --memory-reducer --optimize-for-size --stack-trace-limit=10 --use-strict --turbo-fast-api-calls --max-heap-size 32'
//  v8flags: '--stack-trace-limit=10 --use-strict --turbo-fast-api-calls --no-freeze-flags-after-init --cppgc-young-generation'
}

let link_type = '-static'

const index = 'init.js'
export default { bindings, libs, embeds, target, opt, v8_opts, link_type, index }
