

import { Repository, Update } from './repository';


//////////////////////////////////////////////////////////////////////////
//
// Queue tracks a list of tasks and commands pending execution in a
// repository.
//
//////////////////////////////////////////////////////////////////////////

interface Queue {
	readonly tasks: string[];
	readonly commands: { [task: string]: string[] };
}


//////////////////////////////////////////////////////////////////////////
//
// Derive the current queue from the given repository.
//
//////////////////////////////////////////////////////////////////////////

function queue(repository: Repository) {
	let tasks = [] as string[];
	let commands = {} as { [task: string]: string[] };

	for (const task in repository) {
		const temp1 = repository[task];
		commands[task] = [];

		if (temp1.state == 'submitted') {
			tasks.push(task);
		}

		for (const command in temp1.commands) {
			const temp2 = temp1.commands[command];

			if (temp2.state == 'scheduled') {
				commands[task].push(command);
			}
		}
	}

	return { tasks, commands };
}


//////////////////////////////////////////////////////////////////////////
//
// Apply the given repository update to the given queue and return the
// updated queue.
//
//////////////////////////////////////////////////////////////////////////

function apply(queue: Queue, update: Update): Queue {
	if (update.type == 'create_task_update') {
		const task = update.task;
		const tasks = [ ...queue.tasks, task ];
		const commands = { ...queue.commands, [task]: Object.keys(update.instance.commands) };
		return { tasks, commands };
	} else if (update.type == 'pause_task_update') {
		return dequeue_task(queue, update.task);
	} else if (update.type == 'resume_task_update') {
		return queue_task(queue, update.task);
	} else if (update.type == 'cancel_submitted_task_update') {
		return dequeue_task(queue, update.task);
	} else if (update.type == 'complete_submitted_task_update') {
		return dequeue_task(queue, update.task);
	} else if (update.type == 'restart_task_update') {
		return queue_task(queue, update.task);
	} else if (update.type == 'create_command_update') {
		return queue_command(queue, update.task, update.command);
	} else if (update.type == 'launch_command_update') {
		return dequeue_command(queue, update.task, update.command);
	} else if (update.type == 'reschedule_command_update') {
		return queue_command(queue, update.task, update.command);
	} else if (update.type == 'repeat_command_update') {
		return queue_command(queue, update.task, update.command);
	} else {
		return queue;
	}
}

function queue_task(queue: Queue, task: string): Queue {
	const tasks = [ ...queue.tasks, task ];
	const commands = queue.commands;
	return { tasks, commands };
}

function queue_command(queue: Queue, task: string, command: string): Queue {
	const tasks = queue.tasks;
	const commands = { ...queue.commands, [task]: [ ...queue.commands[task], command ] };
	return { tasks, commands };
}

function dequeue_task(queue: Queue, task: string): Queue {
	const tasks = queue.tasks.filter((item) => (item != task));
	const commands = queue.commands;
	return { tasks, commands };
}

function dequeue_command(queue: Queue, task: string, command: string): Queue {
	const tasks = queue.tasks;
	const commands = { ...queue.commands, [task]: queue.commands[task].filter((item) => (item != command)) };;
	return { tasks, commands };
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	Queue,
	queue,
	apply
}


