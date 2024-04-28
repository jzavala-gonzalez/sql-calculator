<script lang='ts'>
    import { Button } from "$lib/components/ui/button";
    import { get_db, start_pyodide } from "$lib/db_utils";
    import { onMount } from "svelte";

    let db = null;
    let conn = null;
    let pyodide = null;
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

    let shown_text: string = "";
    let available_tables: string[] = [];
    let available_columns: string[] = [];
    let active_table = null;

    function set_active_table(table) {
        active_table = table;
        conn.query(`describe ${active_table}`)
            .then((res) => {
                available_columns = res.getChild('column_name').toArray()
                console.log('new available_columns', available_columns)
        })
    }
    

</script>
<textarea bind:value={shown_text} class='bg-gray-200 w-full'/>

<h2>From</h2>
{#if available_tables.length > 0}
        {#each available_tables as table}
            <Button on:click={() => set_active_table(table)}>{table}</Button>
        {/each}
    
{:else}

    <p>No tables available</p>

{/if}

<h2>Select</h2>
{#if available_columns.length > 0}
        {#each available_columns as col}
            <Button>{col}</Button>
        {/each}
    
{:else}
    <p>No columns available</p>
{/if}



<p>Shown text: {shown_text}</p>
<p>Active table: {active_table}</p>