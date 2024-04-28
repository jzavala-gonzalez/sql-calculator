import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
// import { loadPyodide } from 'pyodide';
import penguins_csv_text from './penguins.csv?raw';

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_eh,
        mainWorker: eh_worker,
    },
};

export async function get_db() {
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    // console.log('penguins_csv_text', penguins_csv_text);
    await db.registerFileText('penguins.csv', penguins_csv_text); // just "registers" file, doesn't create table
    const conn = await db.connect();
    await conn.query(`create or replace table penguins as (from 'penguins.csv')`)
    // (await conn.query(`show tables`)).getChild('name').toArray() // returns ['penguins']
    console.log('test query', (await conn.query(`show tables`)).getChild('name').toArray()) // i dont even KNOW
    // console.table((await conn.query(`from penguins`)).toArray())
    return {db, conn};
}

export async function start_pyodide() {
    const pyodide = await loadPyodide();
    await pyodide.loadPackage('micropip');
    const micropip = pyodide.pyimport('micropip');
    await micropip.install('sqlglot');
    return pyodide
}

