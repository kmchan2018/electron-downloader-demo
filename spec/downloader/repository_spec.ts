

import * as Repository from '../../downloader/repository';


describe('Repository', function() {
	const download = <Repository.Download> { url: 'page1', path: 'path', title: 'title', preview: 'preview' };
	const visit = <Repository.Visit> { type: 'visit', url: 'page1' };
	const save = <Repository.Save>{ type: 'save', url: 'asset1', path: 'path/basename1' };

	const epoch = 0;
	const initial = Repository.repository();

	function extract_new_task(updates: Repository.Update[]): string {
		for (const update of updates) {
			if (update.type == 'create_task_update') {
				return update.task;
			}
		}
		throw new Error('Cannot find any command');
	}

	function extract_new_command(updates: Repository.Update[]): string {
		for (const update of updates) {
			if (update.type == 'create_command_update') {
				return update.command;
			} else if (update.type == 'create_task_update') {
				const command = Object.keys(update.instance.commands).shift();
				if (typeof command == 'string') {
					return command;
				}
			}
		}
		throw new Error('Cannot find any command');
	}

	it('submit() should accept new downloads into a repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		expect(updates).toEqual([
			<Repository.CreateTaskUpdate> {
				type: 'create_task_update',
				time: epoch,
				task: task,
				instance: <Repository.Task> {
					...download,
					state: 'submitted',
					scheduled: 1,
					launched: 0,
					finished: 0,
					create_time: epoch,
					active_time: epoch,
					commands: {
						[command1]: <Repository.Command> {
							...visit,
							state: 'scheduled',
							attempts: 0,
							create_time: epoch,
							active_time: epoch,
		}}}}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'submitted',
				scheduled: 1,
				launched: 0,
				finished: 0,
				create_time: epoch,
				active_time: epoch,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch,
						active_time: epoch,
		}}}});
	});

	it('pause() should pause a submitted task in the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		updates = Repository.pause(repository, task, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.PauseTaskUpdate> {
				type: 'pause_task_update',
				time: epoch + 1,
				task: task,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'paused',
				scheduled: 1,
				launched: 0,
				finished: 0,
				create_time: epoch,
				active_time: epoch + 1,
				pause_time: epoch + 1,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch,
						active_time: epoch,
		}}}});
	});

	it('resume() should resume a paused task in the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		updates = Repository.pause(repository, task, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		updates = Repository.resume(repository, task, epoch + 2);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.ResumeTaskUpdate> {
				type: 'resume_task_update',
				time: epoch + 2,
				task: task,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'submitted',
				scheduled: 1,
				launched: 0,
				finished: 0,
				create_time: epoch,
				active_time: epoch + 2,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch,
						active_time: epoch,
		}}}});
	});

	it('cancel() should cancel a submitted task in the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		updates = Repository.cancel(repository, task, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.CancelSubmittedTaskUpdate> {
				type: 'cancel_submitted_task_update',
				time: epoch + 1,
				task: task,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'cancelled',
				scheduled: 1,
				launched: 0,
				finished: 0,
				create_time: epoch,
				active_time: epoch + 1,
				cancel_time: epoch + 1,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch,
						active_time: epoch,
		}}}});
	});

	it('cancel() should cancel a paused task in the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		updates = Repository.pause(repository, task, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		updates = Repository.cancel(repository, task, epoch + 2);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.CancelPausedTaskUpdate> {
				type: 'cancel_paused_task_update',
				time: epoch + 2,
				task: task,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'cancelled',
				scheduled: 1,
				launched: 0,
				finished: 0,
				create_time: epoch,
				active_time: epoch + 2,
				cancel_time: epoch + 2,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch,
						active_time: epoch,
		}}}});
	});

	it('schedule() should schedule an operation to a task the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);
		let command2: string;

		updates = Repository.schedule(repository, task, save, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);
		command2 = extract_new_command(updates);

		expect(updates).toEqual([
			<Repository.CreateCommandUpdate> {
				type: 'create_command_update',
				time: epoch + 1,
				task: task,
				command: command2,
				instance: {
					...save,
					state: 'scheduled',
					attempts: 0,
					create_time: epoch + 1,
					active_time: epoch + 1
		}}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'submitted',
				scheduled: 2,
				launched: 0,
				finished: 0,
				create_time: epoch,
				active_time: epoch + 1,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch,
						active_time: epoch,
					},
					[command2]: <Repository.Command> {
						...save,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch + 1,
						active_time: epoch + 1
		}}}});
	});

	it('launch() should launch a schedule command of a task in the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		updates = Repository.launch(repository, task, command1, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.LaunchCommandUpdate> {
				type: 'launch_command_update',
				time: epoch + 1,
				task: task,
				command: command1,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'submitted',
				scheduled: 0,
				launched: 1,
				finished: 0,
				create_time: epoch,
				active_time: epoch + 1,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'launched',
						attempts: 1,
						create_time: epoch,
						active_time: epoch + 1,
						launch_time: epoch + 1,
		}}}});
	});

	it('finish() should finish a launched command of a task in the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);
		let command2: string;

		updates = Repository.schedule(repository, task, save, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);
		command2 = extract_new_command(updates);

		updates = Repository.launch(repository, task, command1, epoch + 2);
		repository = updates.reduce(Repository.apply, repository);

		updates = Repository.finish(repository, task, command1, [], epoch + 3);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.FinishCommandUpdate> {
				type: 'finish_command_update',
				time: epoch + 3,
				task: task,
				command: command1,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'submitted',
				scheduled: 1,
				launched: 0,
				finished: 1,
				create_time: epoch,
				active_time: epoch + 3,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'finished',
						attempts: 1,
						create_time: epoch,
						active_time: epoch + 3,
						finish_time: epoch + 3,
					},
					[command2]: <Repository.Command> {
						...save,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch + 1,
						active_time: epoch + 1
		}}}});
	});

	it('finish() should finish a launched command of a task in the repository AND schedule given followup operations', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);
		let command2: string;

		updates = Repository.launch(repository, task, command1, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		updates = Repository.finish(repository, task, command1, [save], epoch + 2);
		repository = updates.reduce(Repository.apply, repository);
		command2 = extract_new_command(updates);

		expect(updates).toEqual([
			<Repository.FinishCommandUpdate> {
				type: 'finish_command_update',
				time: epoch + 2,
				task: task,
				command: command1,
			},
			<Repository.CreateCommandUpdate> {
				type: 'create_command_update',
				time: epoch + 2,
				task: task,
				command: command2,
				instance: <Repository.Command> {
					...save,
					state: 'scheduled',
					attempts: 0,
					create_time: epoch + 2,
					active_time: epoch + 2
		}}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'submitted',
				scheduled: 1,
				launched: 0,
				finished: 1,
				create_time: epoch,
				active_time: epoch + 2,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'finished',
						attempts: 1,
						create_time: epoch,
						active_time: epoch + 2,
						finish_time: epoch + 2,
					},
					[command2]: <Repository.Command> {
						...save,
						state: 'scheduled',
						attempts: 0,
						create_time: epoch + 2,
						active_time: epoch + 2
		}}}});
	});

	it('finish() should finish a launched command of a task in the repository AND complete the task if appropriate', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		updates = Repository.launch(repository, task, command1, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		updates = Repository.finish(repository, task, command1, [], epoch + 2);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.FinishCommandUpdate> {
				type: 'finish_command_update',
				time: epoch + 2,
				task: task,
				command: command1,
			},
			<Repository.CompleteSubmittedTaskUpdate> {
				type: 'complete_submitted_task_update',
				time: epoch + 2,
				task: task,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'completed',
				scheduled: 0,
				launched: 0,
				finished: 1,
				create_time: epoch,
				active_time: epoch + 2,
				complete_time: epoch + 2,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'finished',
						attempts: 1,
						create_time: epoch,
						active_time: epoch + 2,
						finish_time: epoch + 2,
		}}}});
	});

	it('reschedule() should reschedule a launched command of a task in the repository', function() {
		let updates = Repository.submit(initial, download, epoch);
		let repository = updates.reduce(Repository.apply, initial);
		let task = extract_new_task(updates);
		let command1 = extract_new_command(updates);

		updates = Repository.launch(repository, task, command1, epoch + 1);
		repository = updates.reduce(Repository.apply, repository);

		updates = Repository.reschedule(repository, task, command1, epoch + 2);
		repository = updates.reduce(Repository.apply, repository);

		expect(updates).toEqual([
			<Repository.RescheduleCommandUpdate> {
				type: 'reschedule_command_update',
				time: epoch + 2,
				task: task,
				command: command1,
		}]);

		expect(repository).toEqual({
			[task]: <Repository.Task> {
				...download,
				state: 'submitted',
				scheduled: 1,
				launched: 0,
				finished: 0,
				create_time: epoch,
				active_time: epoch + 2,
				commands: {
					[command1]: <Repository.Command> {
						...visit,
						state: 'scheduled',
						attempts: 1,
						create_time: epoch,
						active_time: epoch + 2,
		}}}});
	});
});


