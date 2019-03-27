

//////////////////////////////////////////////////////////////////////////
//
// Download represents a job to process a gallery and download its assets
// to the given file path.
//
// The `path` field specifies the path where the assets are saved. Please
// refer to Gallery class for the meaning of other fields.
//
//////////////////////////////////////////////////////////////////////////

interface Download {
	readonly url: string;
	readonly path: string;
	readonly title: string;
	readonly preview: string;
}


//////////////////////////////////////////////////////////////////////////
//
// Save represents an operation to save a gallery asset to the given file
// path.
//
// The `path` field specifies the path where the asset is saved. Please
// refer to Asset class for the meaning of other fields.
//
//////////////////////////////////////////////////////////////////////////

interface Save {
	readonly type: 'save';
	readonly url: string;
	readonly path: string;
}


//////////////////////////////////////////////////////////////////////////
//
// Visit represents an operation to analyze a gallery page and extract
// other pages and assets in the same gallery.
//
// Please refer to the Page class for the meaning of the fields.
//
//////////////////////////////////////////////////////////////////////////

interface Visit {
	readonly type: 'visit';
	readonly url: string;
}


//////////////////////////////////////////////////////////////////////////
//
// Operation is a discriminated union of all operation types like save
// and visit.
//
//////////////////////////////////////////////////////////////////////////

type Operation =
	Save |
	Visit


//////////////////////////////////////////////////////////////////////////
//
// Command represents an operation in the repository plus its current
// execution status.
//
// The `state` field specifies the current state of the command. A command
// can be in one of the three states. The `scheduled` state means that the
// command is yet to be executed. The `launched` state means that the
// command is being executed. The `finished` state means that the command
// is executed.
//
// The `attempts` field tracks the execution count of the command. A new
// command will have the counter set to zero. When a command is executed,
// its attempt counter will increase by one.
//
// The remaining fields are various timestamps tracking when some event
// occured. The unit is the number milliseconds since the UNIX epoch.
//
//////////////////////////////////////////////////////////////////////////

type Command = Operation & {
	readonly state: 'scheduled' | 'launched' | 'finished';
	readonly attempts: number;
	readonly create_time: number;
	readonly active_time: number;
	readonly launch_time?: number;
	readonly finish_time?: number;
}


//////////////////////////////////////////////////////////////////////////
//
// Task represents a download in the repository plus its current execution
// status.
//
// The `commands` is a map of commands belonging to this task. The map is
// keyed by unique identifier for each command.
//
// The `state` field specifies the current state of the task. A task can
// be in one of the four states. The `submitted` state means that the
// task is being processed. The `paused` state means that the task is
// temporarily blocked from processing. The `completed` state means that
// the task is fully processed. The `cancelled` state means that the task
// is permanently blocked from processing.
//
// The `scheduled`, `launched` and `finished` fields track the number
// of commands in the task at the respective states.
//
// The remaining fields are various timestamps tracking when some event
// occured. The unit is the number milliseconds since the UNIX epoch.
//
//////////////////////////////////////////////////////////////////////////

type Task = Download & {
	readonly commands: { [id: string]: Command };
	readonly state: 'submitted' | 'paused' | 'completed' | 'cancelled';
	readonly scheduled: number;
	readonly launched: number;
	readonly finished: number;
	readonly create_time: number;
	readonly active_time: number;
	readonly pause_time?: number;
	readonly complete_time?: number;
	readonly cancel_time?: number;
}


//////////////////////////////////////////////////////////////////////////
//
// Repository represents a map of tasks in the downloader. The map is
// keyed by unique identifier for each task.
//
//////////////////////////////////////////////////////////////////////////

interface Repository {
	readonly [id: string]: Task;
}


//////////////////////////////////////////////////////////////////////////
//
// CreateTaskUpdate represents an update that adds a new task to the
// repository.
//
// The `task` field specifies the unique identifier of the new task. The
// `instance` field specifies the actual task object. The `time` field
// specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface CreateTaskUpdate {
	readonly type: 'create_task_update';
	readonly task: string;
	readonly instance: Task;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// PauseTaskUpdate represents an update that pauses an submitted task in
// the repository moving it to the `paused` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface PauseTaskUpdate {
	readonly type: 'pause_task_update';
	readonly task: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// ResumeTaskUpdate represents an update that resumes a paused task in
// the repository moving it back to the `submitted` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface ResumeTaskUpdate {
	readonly type: 'resume_task_update';
	readonly task: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// CancelSubmittedTaskUpdate represents an update to cancel a submitted
// task in the repository moving it to the `cancelled` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface CancelSubmittedTaskUpdate {
	readonly type: 'cancel_submitted_task_update';
	readonly task: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// CancelPausedTaskUpdate represents an update to cancel a paused task
// in the repository moving it to the `cancelled` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface CancelPausedTaskUpdate {
	readonly type: 'cancel_paused_task_update';
	readonly task: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// CompleteSubmittedTaskUpdate represents an update to complete a
// submitted task in the repository moving it to the `completed` state.
// Note that the update will NOT move any commands under the target task
// to the `finished` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface CompleteSubmittedTaskUpdate {
	readonly type: 'complete_submitted_task_update';
	readonly task: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// CompletePausedTaskUpdate represents an update to complete a paused
// task in the repository moving it to the `completed` state. Note that
// the update will NOT move any commands under the target task to the 
// `finished` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface CompletePausedTaskUpdate {
	readonly type: 'complete_paused_task_update';
	readonly task: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// RestartTaskUpdate represents an update that restarts a completed task
// in the repository moving it back to the `submitted` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface RestartTaskUpdate {
	readonly type: 'restart_task_update';
	readonly task: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// CreateCommandUpdate represents an update that adds a new command to the
// repository under the given task.
//
// The `task` field specifies the unique identifier of the target task.
// The `command` field specifies the unique identifier of the new command.
// The `instance` field specifies the actual task object. The `time` field
// specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface CreateCommandUpdate {
	readonly type: 'create_command_update';
	readonly task: string;
	readonly command: string;
	readonly instance: Command;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// LaunchCommandUpdate represents an update that launches an scheduled
// command in the repository moving it to the `launched` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `command` field specifies the unique identifier of the target
// command. The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface LaunchCommandUpdate {
	readonly type: 'launch_command_update';
	readonly task: string;
	readonly command: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// FinishCommandUpdate represents an update that finishes a launched
// command in the repository moving it to the `finished` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `command` field specifies the unique identifier of the target
// command. The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface FinishCommandUpdate {
	readonly type: 'finish_command_update';
	readonly task: string;
	readonly command: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// RescheduleCommandUpdate represents an update that reschedules a
// launched command in the repository moving it back to the `scheduled`
// state.
//
// The `task` field specifies the unique identifier of the target task.
// The `command` field specifies the unique identifier of the target
// command. The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface RescheduleCommandUpdate {
	readonly type: 'reschedule_command_update';
	readonly task: string;
	readonly command: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// RepeatCommandUpdate represents an update that repeats a finished
// command in the repository moving it back to `scheduled` state.
//
// The `task` field specifies the unique identifier of the target task.
// The `command` field specifies the unique identifier of the target
// command. The `time` field specifies the time when the event occured.
//
//////////////////////////////////////////////////////////////////////////

interface RepeatCommandUpdate {
	readonly type: 'repeat_command_update';
	readonly task: string;
	readonly command: string;
	readonly time: number;
}


//////////////////////////////////////////////////////////////////////////
//
// Update is a discriminated union of all update types like create task
// update, pause task update, etc.
//
//////////////////////////////////////////////////////////////////////////

type Update =
	CreateTaskUpdate |
	PauseTaskUpdate |
	ResumeTaskUpdate |
	CancelSubmittedTaskUpdate |
	CancelPausedTaskUpdate |
	CompleteSubmittedTaskUpdate |
	CompletePausedTaskUpdate |
	RestartTaskUpdate |
	CreateCommandUpdate |
	LaunchCommandUpdate |
	FinishCommandUpdate |
	RescheduleCommandUpdate |
	RepeatCommandUpdate


//////////////////////////////////////////////////////////////////////////
//
// Helper function to generate a random identifier that pass the given
// filter function. The filter function takes a string and checks if it
// is acceptable.
//
// Usually the filter function checks if the generated string is already
// used. In this case, the function can be used to generate unique
// identifier for tasks and commands.
//
//////////////////////////////////////////////////////////////////////////

function random_id(filter?: (candidate: string) => boolean): string {
	const characters = '0123456789abcdefghijklmnopqrstuvwxyz';

	while (true) {
		let candidate = '';

		for (let i = 0; i < 16; i++) {
			candidate = candidate + characters.charAt(Math.round(Math.random() * 36));
		}

		if (filter == undefined) {
			return candidate;
		} else if (filter(candidate) == true) {
			return candidate;
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Create a new empty repository without any tasks.
//
//////////////////////////////////////////////////////////////////////////

function repository(): Repository {
	return {};
}


//////////////////////////////////////////////////////////////////////////
//
// Submit a download to the repository and create a corresponding task
// there. The function will return the corresponding repository updates.
//
//////////////////////////////////////////////////////////////////////////

function submit(repository: Repository, download: Download, time: number): Update[] {
	const filter = (candidate: string) => repository.hasOwnProperty(candidate) == false;
	const task = random_id(filter);

	{
		const type = 'visit';
		const url = download.url;
		const state = 'scheduled';
		const attempts = 0;
		const create_time = time;
		const active_time = time;
		const command = <Command> { type, url, state, attempts, create_time, active_time };

		{
			const id = random_id();
			const commands = { [id]: command };
			const state = 'submitted';
			const scheduled = 1;
			const launched = 0;
			const finished = 0;
			const instance = <Task> { ...download, commands, state, scheduled, launched, finished, create_time, active_time };

			return [{ type: 'create_task_update', task, instance, time }];
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Pause the given task in the repository. The function will return the
// corresponding repository updates.
//
// The function expects the given task to exist in the repository.
// Violation of this precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the 'submitted'
// state. An error will also be thrown when the precondition is violated.
//
//////////////////////////////////////////////////////////////////////////

function pause(repository: Repository, task: string, time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].state == 'paused') {
		throw new Error('cannot pause a paused task');
	} else if (repository[task].state == 'completed') {
		throw new Error('cannot pause a completed task');
	} else if (repository[task].state == 'cancelled') {
		throw new Error('cannot pause a cancelled task');
	} else {
		return [{ type: 'pause_task_update', task, time }];
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Resume the given task in the repository. The function will return the
// corresponding repository updates.
//
// The function expects the given task to exist in the repository.
// Violation of this precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the `paused`
// state. An error will also be thrown when the precondition is violated.
//
//////////////////////////////////////////////////////////////////////////

function resume(repository: Repository, task: string, time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].state == 'submitted') {
		throw new Error('cannot resume a submitted task');
	} else if (repository[task].state == 'completed') {
		throw new Error('cannot resume a completed task');
	} else if (repository[task].state == 'cancelled') {
		throw new Error('cannot resume a cancelled task');
	} else {
		return [{ type: 'resume_task_update', task, time }];
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Cancel the given task in the repository. The function will return the
// corresponding repository updates.
//
// The function expects the given task to exist in the repository.
// Violation of this precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the `submitted`
// or `paused` state. An error will also be thrown when the precondition
// is violated.
//
//////////////////////////////////////////////////////////////////////////

function cancel(repository: Repository, task: string, time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].state == 'completed') {
		throw new Error('cannot cancel a completed task');
	} else if (repository[task].state == 'cancelled') {
		throw new Error('cannot resume a cancelled task');
	} else {
		if (repository[task].state == 'submitted') {
			return [{ type: 'cancel_submitted_task_update', task, time }];
		} else if (repository[task].state == 'paused') {
			return [{ type: 'cancel_paused_task_update', task, time }];
		} else {
			throw new Error('unreachable code');
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Schedule an operation as a new command under the given task in the
// repository. The function will return the corresponding repository
// updates.
//
// The function expects the given task to exist in the repository.
// Violation of this precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the `submitted`
// or `paused` state. An error will also be thrown when the precondition
// is violated.
//
//////////////////////////////////////////////////////////////////////////

function schedule(repository: Repository, task: string, operation: Operation, time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].state == 'completed') {
		throw new Error('cannot schedule new command to a completed task');
	} else if (repository[task].state == 'cancelled') {
		throw new Error('cannot schedule new command to a cancelled task');
	} else {
		const filter = (candidate: string) => repository[task].commands.hasOwnProperty(candidate) == false;
		const command = random_id(filter);
		const state = 'scheduled';
		const attempts = 0;
		const create_time = time;
		const active_time = time;
		const instance = <Command> { ...operation, state, attempts, create_time, active_time };
		return [{ type: 'create_command_update', task, command, instance, time }];
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Launch the given command under the given task in the repository. The
// function will return the corresponding repository updates.
//
// The function expects the given task to exist in the repository, and
// the given command to exist under the given task. Violation of this
// precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the `submitted`
// or `paused` state. An error will also be thrown when the precondition
// is violated.
//
// Finally, the function expects the given command to be in the
// `scheduled` state. An error will also be thrown when the precondition
// is violated.
//
//////////////////////////////////////////////////////////////////////////

function launch(repository: Repository, task: string, command: string, time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].commands.hasOwnProperty(command) == false) {
		throw new Error('unknown command');
	} else if (repository[task].state == 'paused') {
		throw new Error('cannot launch command in a paused task');
	} else if (repository[task].state == 'completed') {
		throw new Error('cannot launch comamnd in a completed task');
	} else if (repository[task].state == 'cancelled') {
		throw new Error('cannot launch command in a cancelled task');
	} else if (repository[task].commands[command].state == 'launched') {
		throw new Error('cannot launch a launched command');
	} else if (repository[task].commands[command].state == 'finished') {
		throw new Error('cannot launch a finished command');
	} else {
		return [{ type: 'launch_command_update', task, command, time }];
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Finish the given command under the given task in the repository. The
// function will return the corresponding repository updates.
//
// The function expects the given task to exist in the repository, and
// the given command to exist under the given task. Violation of this
// precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the `submitted`,
// `paused` or `cancelled` state. An error will also be thrown when the
// precondition is violated.
//
// Finally, the function expects the given command to be in the `launched`
// state. An error will also be thrown when the precondition is violated.
//
//////////////////////////////////////////////////////////////////////////

function finish(repository: Repository, task: string, command: string, followups: Operation[], time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].commands.hasOwnProperty(command) == false) {
		throw new Error('unknown command');
	} else if (repository[task].state == 'completed') {
		throw new Error('cannot finish comamnd in a completed task');
	} else if (repository[task].commands[command].state == 'scheduled') {
		throw new Error('cannot finish a scheduled command');
	} else if (repository[task].commands[command].state == 'finished') {
		throw new Error('cannot finish a finished command');
	} else {
		let updates = [{ type: 'finish_command_update', task, command, time }] as Update[];
		let ids = [] as string[];

		const filter1 = (candidate: string) => repository[task].commands.hasOwnProperty(candidate) == false;
		const filter2 = (candidate: string) => ids.indexOf(candidate) == -1;
		const filter = (candidate: string) => filter1(candidate) && filter2(candidate);

		for (const followup of followups) {
			const command = random_id(filter);
			const state = 'scheduled';
			const attempts = 0;
			const create_time = time;
			const active_time = time;
			const instance = <Command> { ...followup, state, attempts, create_time, active_time };
			updates.push({ type: 'create_command_update', task, command, instance, time });
			ids.push(command);
		}

		if (followups.length > 0) {
			return updates;
		} else if (repository[task].scheduled > 0) {
			return updates;
		} else if (repository[task].launched > 1) {
			return updates;
		} else if (repository[task].state == 'cancelled') {
			return updates;
		} else if (repository[task].state == 'submitted') {
			updates.push({ type: 'complete_submitted_task_update', task, time });
			return updates;
		} else if (repository[task].state == 'paused') {
			updates.push({ type: 'complete_paused_task_update', task, time });
			return updates;
		} else {
			throw new Error('unreachable code');
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Reschedule the given command under the given task in the repository.
// The function will return the corresponding repository updates.
//
// The function expects the given task to exist in the repository, and
// the given command to exist under the given task. Violation of this
// precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the `submitted`,
// `paused` or `cancelled` state. An error will also be thrown when the
// precondition is violated.
//
// Finally, the function expects the given command to be in the `launched`
// state. An error will also be thrown when the precondition is violated.
//
//////////////////////////////////////////////////////////////////////////

function reschedule(repository: Repository, task: string, command: string, time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].commands.hasOwnProperty(command) == false) {
		throw new Error('unknown command');
	} else if (repository[task].state == 'completed') {
		throw new Error('cannot reschedule command in a completed task');
	} else if (repository[task].commands[command].state == 'scheduled') {
		throw new Error('cannot reschedule a scheduled command');
	} else if (repository[task].commands[command].state == 'finished') {
		throw new Error('cannot reschedule a finished command');
	} else {
		return [{ type: 'reschedule_command_update', task, command, time }];
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Repeat the given command under the given task in the repository.
// The function will return the corresponding repository updates.
//
// The function expects the given task to exist in the repository, and
// the given command to exist under the given task. Violation of this
// precondition will cause an error to be thrown.
//
// Moreover, the function expects the given task to be in the `submitted`,
// `paused` or `completed` state. An error will also be thrown when the
// precondition is violated.
//
// Finally, the function expects the given command to be in the `finished`
// state. An error will also be thrown when the precondition is violated.
//
//////////////////////////////////////////////////////////////////////////

function repeat(repository: Repository, task: string, command: string, time: number): Update[] {
	if (repository.hasOwnProperty(task) == false) {
		throw new Error('unknown task');
	} else if (repository[task].commands.hasOwnProperty(command) == false) {
		throw new Error('unknown command');
	} else if (repository[task].state == 'cancelled') {
		throw new Error('cannot repeat comamnd in a cancelled task');
	} else if (repository[task].commands[command].state == 'scheduled') {
		throw new Error('cannot repeat a scheduled command');
	} else if (repository[task].commands[command].state == 'launched') {
		throw new Error('cannot repeat a launched command');
	} else {
		if (repository[task].state != 'completed') {
			return [{ type: 'repeat_command_update', task, command, time }];
		} else {
			return [
				{ type: 'restart_task_update', task, time},
				{ type: 'repeat_command_update', task, command, time }
			];
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Apply the given repository update to the given repository and return
// the updated repository.
//
//////////////////////////////////////////////////////////////////////////

function apply(repository: Repository, update: Update): Repository {
	switch (update.type) {
		case 'create_task_update': return apply_create_task(repository, update);
		case 'pause_task_update': return apply_pause_task(repository, update);
		case 'resume_task_update': return apply_resume_task(repository, update);
		case 'cancel_submitted_task_update': return apply_cancel_submitted_task(repository, update);
		case 'cancel_paused_task_update': return apply_cancel_paused_task(repository, update);
		case 'complete_submitted_task_update': return apply_complete_submitted_task(repository, update);
		case 'complete_paused_task_update': return apply_complete_paused_task(repository, update);
		case 'restart_task_update': return apply_restart_task(repository, update);
		case 'create_command_update': return apply_create_command(repository, update);
		case 'launch_command_update': return apply_launch_command(repository, update);
		case 'finish_command_update': return apply_finish_command(repository, update);
		case 'reschedule_command_update': return apply_reschedule_command(repository, update);
		case 'repeat_command_update': return apply_repeat_command(repository, update);
	}
}

function apply_create_task(repository: Repository, update: CreateTaskUpdate): Repository {
	const task = update.task;
	const instance = update.instance;

	return {
		...repository,
		[task]: update.instance,
	};
}

function apply_pause_task(repository: Repository, update: PauseTaskUpdate): Repository {
	const task = update.task;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			url: target1.url,
			path: target1.path,
			title: target1.title,
			preview: target1.preview,
			commands: target1.commands,
			state: 'paused',
			scheduled: target1.scheduled,
			launched: target1.launched,
			finished: target1.finished,
			create_time: target1.create_time,
			active_time: update.time,
			pause_time: update.time,
		},
	};
}

function apply_resume_task(repository: Repository, update: ResumeTaskUpdate): Repository {
	const task = update.task;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			url: target1.url,
			path: target1.path,
			title: target1.title,
			preview: target1.preview,
			commands: target1.commands,
			state: 'submitted',
			scheduled: target1.scheduled,
			launched: target1.launched,
			finished: target1.finished,
			create_time: target1.create_time,
			active_time: update.time,
		},
	};
}

function apply_cancel_submitted_task(repository: Repository, update: CancelSubmittedTaskUpdate): Repository {
	const task = update.task;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			url: target1.url,
			path: target1.path,
			title: target1.title,
			preview: target1.preview,
			commands: target1.commands,
			state: 'cancelled',
			scheduled: target1.scheduled,
			launched: target1.launched,
			finished: target1.finished,
			create_time: target1.create_time,
			active_time: update.time,
			cancel_time: update.time,
		},
	};
}

function apply_cancel_paused_task(repository: Repository, update: CancelPausedTaskUpdate): Repository {
	const task = update.task;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			url: target1.url,
			path: target1.path,
			title: target1.title,
			preview: target1.preview,
			commands: target1.commands,
			state: 'cancelled',
			scheduled: target1.scheduled,
			launched: target1.launched,
			finished: target1.finished,
			create_time: target1.create_time,
			active_time: update.time,
			cancel_time: update.time,
		},
	};
}

function apply_complete_submitted_task(repository: Repository, update: CompleteSubmittedTaskUpdate): Repository {
	const task = update.task;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			url: target1.url,
			path: target1.path,
			title: target1.title,
			preview: target1.preview,
			commands: target1.commands,
			state: 'completed',
			scheduled: target1.scheduled,
			launched: target1.launched,
			finished: target1.finished,
			create_time: target1.create_time,
			active_time: update.time,
			complete_time: update.time,
		},
	};
}

function apply_complete_paused_task(repository: Repository, update: CompletePausedTaskUpdate): Repository {
	const task = update.task;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			url: target1.url,
			path: target1.path,
			title: target1.title,
			preview: target1.preview,
			commands: target1.commands,
			state: 'completed',
			scheduled: target1.scheduled,
			launched: target1.launched,
			finished: target1.finished,
			create_time: target1.create_time,
			active_time: update.time,
			complete_time: update.time,
		},
	};
}

function apply_restart_task(repository: Repository, update: RestartTaskUpdate): Repository {
	const task = update.task;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			url: target1.url,
			path: target1.path,
			title: target1.title,
			preview: target1.preview,
			commands: target1.commands,
			state: 'submitted',
			scheduled: target1.scheduled,
			launched: target1.launched,
			finished: target1.finished,
			create_time: target1.create_time,
			active_time: update.time,
		},
	};
}

function apply_create_command(repository: Repository, update: CreateCommandUpdate): Repository {
	const task = update.task;
	const command = update.command;
	const instance = update.instance;
	const target1 = repository[task];

	return {
		...repository,
		[task]: {
			...target1,
			scheduled: target1.scheduled + 1,
			active_time: update.time,
			commands: {
				...target1.commands,
				[command]: instance,
			},
		},
	};
}

function apply_launch_command(repository: Repository, update: LaunchCommandUpdate): Repository {
	const task = update.task;
	const command = update.command;
	const target1 = repository[task];
	const target2 = repository[task].commands[command];

	return {
		...repository,
		[task]: {
			...target1,
			scheduled: target1.scheduled - 1,
			launched: target1.launched + 1,
			active_time: update.time,
			commands: {
				...target1.commands,
				[command]: (
					target2.type == 'visit' ? {
						type: 'visit',
						url: target2.url,
						state: 'launched',
						attempts: target2.attempts + 1,
						create_time: target2.create_time,
						active_time: update.time,
						launch_time: update.time,
					} : {
						type: 'save',
						url: target2.url,
						path: target2.path,
						state: 'launched',
						attempts: target2.attempts + 1,
						create_time: target2.create_time,
						active_time: update.time,
						launch_time: update.time,
					}
				),
			},
		},
	};
}

function apply_finish_command(repository: Repository, update: FinishCommandUpdate): Repository {
	const task = update.task;
	const command = update.command;
	const target1 = repository[task];
	const target2 = repository[task].commands[command];

	return {
		...repository,
		[task]: {
			...target1,
			launched: target1.launched - 1,
			finished: target1.finished + 1,
			active_time: update.time,
			commands: {
				...target1.commands,
				[command]: (
					target2.type == 'visit' ? {
						type: 'visit',
						url: target2.url,
						state: 'finished',
						attempts: target2.attempts,
						create_time: target2.create_time,
						active_time: update.time,
						finish_time: update.time,
					} : {
						type: 'save',
						url: target2.url,
						path: target2.path,
						state: 'finished',
						attempts: target2.attempts,
						create_time: target2.create_time,
						active_time: update.time,
						finish_time: update.time,
					}
				),
			},
		},
	};
}

function apply_reschedule_command(repository: Repository, update: RescheduleCommandUpdate): Repository {
	const task = update.task;
	const command = update.command;
	const target1 = repository[task];
	const target2 = repository[task].commands[command];

	return {
		...repository,
		[task]: {
			...target1,
			scheduled: target1.scheduled + 1,
			launched: target1.launched - 1,
			active_time: update.time,
			commands: {
				...target1.commands,
				[command]: (
					target2.type == 'visit' ? {
						type: 'visit',
						url: target2.url,
						state: 'scheduled',
						attempts: target2.attempts,
						create_time: target2.create_time,
						active_time: update.time,
					} : {
						type: 'save',
						url: target2.url,
						path: target2.path,
						state: 'scheduled',
						attempts: target2.attempts,
						create_time: target2.create_time,
						active_time: update.time,
					}
				),
			},
		},
	};
}

function apply_repeat_command(repository: Repository, update: RepeatCommandUpdate): Repository {
	const task = update.task;
	const command = update.command;
	const target1 = repository[task];
	const target2 = repository[task].commands[command];

	return {
		...repository,
		[task]: {
			...target1,
			scheduled: target1.scheduled + 1,
			finished: target1.finished - 1,
			active_time: update.time,
			commands: {
				...target1.commands,
				[command]: (
					target2.type == 'visit' ? {
						type: 'visit',
						url: target2.url,
						state: 'scheduled',
						attempts: target2.attempts,
						create_time: target2.create_time,
						active_time: update.time,
					} : {
						type: 'save',
						url: target2.url,
						path: target2.path,
						state: 'scheduled',
						attempts: target2.attempts,
						create_time: target2.create_time,
						active_time: update.time,
					}
				),
			},
		},
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	Download,
	Operation,
	Save,
	Visit,
	Repository,
	Task,
	Command,
	Update,
	CreateTaskUpdate,
	PauseTaskUpdate,
	ResumeTaskUpdate,
	CancelSubmittedTaskUpdate,
	CancelPausedTaskUpdate,
	CompleteSubmittedTaskUpdate,
	CompletePausedTaskUpdate,
	RestartTaskUpdate,
	CreateCommandUpdate,
	LaunchCommandUpdate,
	FinishCommandUpdate,
	RescheduleCommandUpdate,
	RepeatCommandUpdate,
	repository,
	submit,
	pause,
	resume,
	cancel,
	schedule,
	launch,
	finish,
	reschedule,
	repeat,
	apply
}


