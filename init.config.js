const bindings = ['core']
const libs = []
const embeds = []
const target = 'init' 
const link_type = '-static'
const opt = '-O3 -march=native -mtune=native'
const v8_opts = {
  v8_cleanup: 0, v8_threads: 1, on_exit: 0,
//  v8flags: '--lite-mode --jitless --single-threaded --disable-write-barriers --no-verify-heap --no-expose-wasm --memory-reducer --optimize-for-size --stack-trace-limit=10 --use-strict --turbo-fast-api-calls --max-heap-size 16'
  v8flags: '--stack-trace-limit=10 --use-strict --turbo-fast-api-calls --max-heap-size 16'
}
const main = 'init.js'

export default { bindings, libs, embeds, target, link_type, opt, v8_opts, main }
