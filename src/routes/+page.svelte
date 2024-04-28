<script lang='ts'>
    import { Button } from "$lib/components/ui/button";
    import * as Table from '$lib/components/ui/table';
    import { get_db, start_pyodide } from "$lib/db_utils";
    import { onMount } from "svelte";

    let db = null;
    let conn = null;
    let pyodide = null;
    let ast = null;
    let ready = false;
    onMount(() => {
        let promises = [
        // Load Pyodide
        start_pyodide()
        .then((pyodide_) => {
            pyodide = pyodide_;
            console.log('pyodide loaded', pyodide)
        }),

        // Load DuckDB
        get_db()
        .then((db_) => {
            db = db_.db;
            conn = db_.conn;
            console.log('db loaded', db)
        })
        ]

        Promise.allSettled(promises).then((results) => {
            console.log('all loaded', results)
            results.forEach(r => console.log(r.status))
            ready = true;

            console.log(
                'running python code',
                pyodide.runPython(`
                from sqlglot import parse_one
                ast = parse_one('select * from mytable')
                str(ast)
                `)
            );

            conn.query(`show tables`)
            .then((res) => {
                available_tables = res.getChild('name').toArray()
            
            })
        })
    });

    $: shown_text = (ast === null) ? "" : ast.sql();
    let available_tables: string[] = [];
    let available_columns: string[] = [];
    let active_table = null;
    let chosen_columns: string[] = [];

    $: execute_query(shown_text)

    function set_active_table(table) {
        active_table = table;
        if (ast === null) {
            ast = pyodide.runPython(`
                ast = parse_one('select * from ${active_table}')
                ast
            `)
            chosen_columns = ['*']
        } else {
            ast = ast.from_(active_table)
        }
        // shown_text = ast.sql(dialect='duckdb')
        conn.query(`describe ${active_table}`)
            .then((res) => {
                available_columns = res.getChild('column_name').toArray()
                console.log('new available_columns', available_columns)
        })
    }

    function select_column(col) {
        ast = ast.select(col)
        chosen_columns = [...chosen_columns, col]
    }

    function reset_columns() {
        ast.set('expressions', [])
        ast = ast
        chosen_columns = []
        query_result = undefined;
    }

    let query_result;
    function execute_query(sql) {
        if (ready && (sql !== '') && (chosen_columns.length > 0)) {
            console.log('executing query', sql)
            conn.query(sql)
            .then((res) => {
                query_result = res
                console.log('query_result', res)
            })
        } else {
            return null;
        }
    }
    

</script>
<textarea bind:value={shown_text} class='bg-gray-200 w-full'/>

<div class='section'>
<h2>From</h2>
{#if available_tables.length > 0}
        {#each available_tables as table}
            <Button on:click={() => set_active_table(table)}>{table}</Button>
        {/each}
    
{:else}

    <p>No tables available</p>

{/if}
</div>

<div class='section'>
<h2>Select</h2>
{#if available_columns.length > 0}
        <div class='flex flex-wrap gap-x-2 gap-y-1 mb-5'>
        {#each ['*',...available_columns] as col}
            <Button on:click={() => select_column(col)}>{col}</Button>
        {/each}
        </div>
        <Button on:click={reset_columns}>Reset columns</Button>
    
{:else if available_tables.length === 0}
    <p>No tables available yet</p>
{:else if active_table === null}
    <p>Choose a table first!</p>
{:else}
    <p>No columns available</p>
{/if}
</div>

<div class="section">
<h2>Result</h2>
  {#if query_result !== undefined}

    <Table.Root>
        <Table.Caption>A list of your result.</Table.Caption>
        <Table.Header>
          <Table.Row>
            {#each query_result.schema.fields as f}
                <Table.Head>{f.name}</Table.Head>
            {/each}
          
            
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {#each query_result as row}
          <Table.Row>
            
            {#each query_result.schema.fields as f}
                <Table.Cell>{row[f.name]}</Table.Cell>
            {/each}
            
          </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
  {/if}


</div>