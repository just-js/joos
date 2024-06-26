const bindings = ['core']
const libs = ['lib/proc.js']
const embeds = []
const target = 'vmm' 
const link_type = '-static'
//const link_type = '-rdynamic -static-libstdc++ -static-libgcc'
const opt = '-O3 -march=native -mtune=native'
const v8_opts = {
  v8_cleanup: 1, v8_threads: 1, on_exit: 0,
//  v8flags: '--stack-trace-limit=10 --use-strict --turbo-fast-api-calls --no-freeze-flags-after-init --max-heap-size 64'  
  v8flags: '--lite-mode --jitless --single-threaded --disable-write-barriers --max-heap-size=64 --no-verify-heap --no-expose-wasm --optimize-for-size --stack-trace-limit=10 --use-strict --turbo-fast-api-calls'
}
const index = 'vmm.js'

export default { bindings, libs, embeds, target, link_type, opt, v8_opts, index }
