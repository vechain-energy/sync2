import * as fs from 'fs'
import * as Module from 'module'
import * as path from 'path'

type ModuleLoader = typeof Module & {
    _initPaths: () => void
}

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

function registerTestPaths() {
    const rootPath = path.join(__dirname, '..')
    const currentPaths = process.env.NODE_PATH
        ? process.env.NODE_PATH.split(path.delimiter)
        : []

    if (!currentPaths.includes(rootPath)) {
        process.env.NODE_PATH = [rootPath, ...currentPaths].join(path.delimiter)
        ;(Module as ModuleLoader)._initPaths()
    }
}

async function main() {
    registerTestPaths()

    const specFiles = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.spec.ts'))
        .sort()

    for (const specFile of specFiles) {
        await import(path.join(__dirname, specFile))
    }

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
