

import { Repository, Update, CreateTaskUpdate, CreateCommandUpdate } from './repository';


//////////////////////////////////////////////////////////////////////////
//
// Ordering maintains sort order of tasks and commands in the repository.
// Both tasks and commands are sorted by their create time.
//
//////////////////////////////////////////////////////////////////////////

interface Ordering {
	readonly tasks: string[];
	readonly commands: { [task: string]: string[] };
}


//////////////////////////////////////////////////////////////////////////
//
// Derive the current ordering from the given repository.
//
//////////////////////////////////////////////////////////////////////////

function ordering(repository: Repository): Ordering {
	const tasks = Object.keys(repository).sort((task1, task2) => {
		if (repository.hasOwnProperty(task1) == false) {
			throw new Error('logic error');
		} else if (repository.hasOwnProperty(task2) == false) {
			throw new Error('logic error');
		} else {
			const time1 = repository[task1].create_time;
			const time2 = repository[task2].create_time;
			return time1 - time2;
		}
	});

	const commands = fromEntries(Object.keys(repository).map((task) => {
		if (repository.hasOwnProperty(task) == false) {
			throw new Error('logic error');
		} else {
			const commands = repository[task].commands;

			return [ task, Object.keys(commands).sort((command1, command2) => {
				if (commands.hasOwnProperty(command1) == false) {
					throw new Error('logic error');
				} else if (commands.hasOwnProperty(command2) == false) {
					throw new Error('logic error');
				} else {
					const time1 = commands[command1].create_time;
					const time2 = commands[command2].create_time;
					return time1 - time2;
				}
			})];
		}
	}));

	return { tasks, commands };
}


//////////////////////////////////////////////////////////////////////////
//
// Apply the given repository update to the given ordering and return
// the updated ordering.
//
//////////////////////////////////////////////////////////////////////////

function apply(ordering: Ordering, update: Update): Ordering {
	switch (update.type) {
		case 'create_task_update': return apply_create_task_update(ordering, update);
		case 'create_command_update': return apply_create_command_update(ordering, update);
		default: return ordering;
	}
}

function apply_create_task_update(ordering: Ordering, update: CreateTaskUpdate): Ordering {
	const tasks = [
		update.task,
		...ordering.tasks
	];

	const commands = {
		...ordering.commands,
		[update.task]: Object.keys(update.instance.commands).sort((command1, command2) => {
			if (update.instance.commands.hasOwnProperty(command1) == false) {
				throw new Error('logic error');
			} else if (update.instance.commands.hasOwnProperty(command2) == false) {
				throw new Error('logic error');
			} else {
				const time1 = update.instance.commands[command1].create_time;
				const time2 = update.instance.commands[command2].create_time;
				return time1 - time2;
			}
		}),
	};

	return { tasks, commands };
}

function apply_create_command_update(ordering: Ordering, update: CreateCommandUpdate): Ordering {
	const tasks = ordering.tasks;
	const commands = { ...ordering.commands, [update.task]: [ ...ordering.commands[update.task], update.command ] };
	return { tasks, commands };
}


//////////////////////////////////////////////////////////////////////////
//
// Mock Object.fromEntries implementation. Note that objects with symbol
// is NOT supported at this point due to typescript github issue 1863:
//
// https://github.com/Microsoft/TypeScript/issues/1863
//
//////////////////////////////////////////////////////////////////////////

function fromEntries<V>(pairs: Iterable<[string,V]>): { [k:string]: V };
function fromEntries<V>(pairs: Iterable<[number,V]>): { [k:number]: V };
function fromEntries<V>(pairs: Iterable<[string|number,V]>): { [k:string]: V; [k:number]: V; };
function fromEntries<V>(pairs: Iterable<Array<string|V>>): { [k:string]: V };
function fromEntries<V>(pairs: Iterable<Array<number|V>>): { [k:number]: V };
function fromEntries<V>(pairs: Iterable<Array<string|number|V>>): { [k:string]: V; [k:number]: V; };
function fromEntries(pairs: Iterable<[string,any]>): { [k:string]: any };
function fromEntries(pairs: Iterable<[number,any]>): { [k:number]: any };
function fromEntries(pairs: Iterable<[string|number,any]>): { [k:string]: any; [k:number]: any; };
function fromEntries(pairs: Iterable<Array<string|any>>): { [k:string]: any };
function fromEntries(pairs: Iterable<Array<number|any>>): { [k:number]: any };
function fromEntries(pairs: Iterable<Array<string|number|any>>): { [k:string]: any; [k:number]: any; };
function fromEntries(pairs: Iterable<Array<any>>): { [k:string]: any; [k:number]: any; } {
	let output = {} as { [k:string]: any; [k:number]: any; };

	for (const pair of Array.from(pairs)) {
		if (typeof pair[0] == 'number') {
			output[pair[0]] = pair[1];
		} else if (typeof pair[0] == 'string') {
			output[pair[0]] = pair[1];
		} else {
			throw new Error('invalid key');
		}
	}

	return output;
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	Ordering,
	ordering,
	apply
}


