type TestCase = {
    name: string
    run: () => void | Promise<void>
}

const tests: TestCase[] = []

const globalScope = global as typeof global & {
    describe: (name: string, run: () => void) => void
    it: (name: string, run: () => void | Promise<void>) => void
}

globalScope.describe = (name: string, run: () => void) => {
    const previousCount = tests.length
    run()
    for (const test of tests.slice(previousCount)) {
        test.name = `${name} ${test.name}`
    }
}

globalScope.it = (name: string, run: () => void | Promise<void>) => {
    tests.push({ name, run })
}

async function main() {
    await import('./vet-domains.spec')
    await import('./fee-market.spec')
    await import('./config-nodes.spec')
    await import('./private-key.spec')
    await import('./vault-worker.spec')
    await import('./vet-domain-registration.spec')
    await import('./vet-domain-wallet-selection.spec')

    for (const test of tests) {
        try {
            await test.run()
            console.log(`ok - ${test.name}`)
        } catch (err) {
            console.error(`not ok - ${test.name}`)
            console.error(err)
            process.exitCode = 1
        }
    }
}

main().catch(err => {
    console.error(err)
    process.exitCode = 1
})
