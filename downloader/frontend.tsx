

import * as Console from 'console';
import * as Fs from 'fs';
import { ipcRenderer, shell } from 'electron';

import * as _ from 'lodash';
import * as Moment from 'moment';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Redux from 'redux';
import * as ReactRedux from 'react-redux';
import * as memoizeOne from 'memoize-one';

import * as Repository from './repository';
import * as Statistics from './statistics';
import * as Ordering from './ordering';
import * as Gallery from './gallery';
import * as Action from './action';


//////////////////////////////////////////////////////////////////////////
//
// Empty interface defines a generic interface without any properties. It
// is useful for scenarios like react component that accepts no prop.
//
//////////////////////////////////////////////////////////////////////////

interface Empty {
	// nothing here
}


//////////////////////////////////////////////////////////////////////////
//
// These types defines the shape of the frontend state.
//
//////////////////////////////////////////////////////////////////////////

interface RepositoryView {
	readonly type: 'repository';
}

interface TaskView {
	readonly type: 'task';
	readonly task: string;
}

interface CreatorView {
	readonly type: 'creator';
	readonly mode: 'edit' | 'submit';
	readonly url: string;
	readonly path: string;
	readonly url_error: string | null;
	readonly path_error: string | null;
}

interface UninitializedState {
	readonly type: 'uninitialized';
}

interface InitializedState {
	readonly type: 'initialized';
	readonly repository: Repository.Repository;
	readonly statistics: Statistics.Statistics;
	readonly ordering: Ordering.Ordering;
	readonly content: RepositoryView | TaskView;
	readonly popup: CreatorView | null;
}

type State = 
	UninitializedState |
	InitializedState


//////////////////////////////////////////////////////////////////////////
//
// Frontend
//
//////////////////////////////////////////////////////////////////////////

class Frontend {
	private middleware: Redux.StoreEnhancer;
	private store: Redux.Store;
	private backend: Backend;

	constructor(channel: string) {
		this.middleware = Redux.applyMiddleware(({}) => next => action => this.intercept_local_action(action, next));
		this.store = Redux.createStore(this.merge_local_action.bind(this), undefined, this.middleware);
		this.backend = new Backend(channel);
		this.store.dispatch({ type: 'nothing' });
		this.backend.watch(this.consume_remote_action.bind(this));
	}

	start() {
		this.backend.send({ type: 'frontend_started' });
	}

	stop() {
		this.backend.send({ type: 'frontend_stopped' });
	}

	render(element: HTMLElement) {
		const Provider = ReactRedux.Provider;
		const component = <Provider store={this.store}><Root /></Provider>;
		ReactDOM.render(component, element);
	}

	private intercept_local_action(action: Action.Action, next: Redux.Dispatch): any {
		switch (action.type) {
			case 'start_creator_popup_submission': return this.intercept_local_start_creator_popup_submission(action, next);
			case 'pause_task': return this.backend.send(action);
			case 'resume_task': return this.backend.send(action);
			case 'cancel_task': return this.backend.send(action);
			case 'repeat_command': return this.backend.send(action);
			default: return next(action);
		}
	}

	private intercept_local_start_creator_popup_submission(action: Action.StartCreatorPopupSubmission, next: Redux.Dispatch): any {
		const state = this.store.getState();

		if (state.type != 'initialized') return;
		if (state.popup == null) return;
		if (state.popup.type != 'creator') return;
		if (state.popup.mode != 'edit') return;

		const url = state.popup.url;
		const path = state.popup.path;
		let url_error = null as string | null;
		let path_error = null as string | null;

		if (url == '') {
			url_error = 'URL cannot be empty';
		}

		if (path == '') {
			path_error = 'Path cannot be empty';
		} else if (Fs.existsSync(path) == false) {
			path_error = 'Path does not exist';
		} else if (Fs.statSync(path).isDirectory() == false) {
			path_error = 'Path is not a directory';
		}

		if (url_error == null && path_error == null) {
			this.backend.send({ type: 'start_extract_gallery', url });
			return next(action);
		} else {
			next(action);
			return next({ type: 'fail_creator_popup_submission', url_error, path_error });
		}
	}

	private merge_local_action(current: State | undefined, action: Action.Action): State {
		console.log('merge_local_action', action);

		if (typeof current == 'undefined') {
			current = { type: 'uninitialized' };
		}

		try {
			if (current.type == 'uninitialized') {
				switch (action.type) {
					case 'backend_started': return this.merge_local_backend_started(current, action);
				}
			} else if (current.type == 'initialized') {
				switch (action.type) {
					case 'repository_update': return this.merge_local_repository_update(current, action);
					case 'show_task_screen': return this.merge_local_show_task_screen(current, action);
					case 'close_task_screen': return this.merge_local_close_task_screen(current, action);
					case 'show_creator_popup': return this.merge_local_show_creator_popup(current, action);
					case 'update_creator_popup_url': return this.merge_local_update_creator_popup_url(current, action);
					case 'update_creator_popup_path': return this.merge_local_update_creator_popup_path(current, action);
					case 'start_creator_popup_submission': return this.merge_local_start_creator_popup_submission(current, action);
					case 'finish_creator_popup_submission': return this.merge_local_finish_creator_popup_submission(current, action);
					case 'fail_creator_popup_submission': return this.merge_local_fail_creator_popup_submission(current, action);
					case 'close_creator_popup': return this.merge_local_close_creator_popup(current, action);
				}
			}

			return current;
		} catch (err) {
			return current;
		}
	}

	private merge_local_backend_started(current: UninitializedState, action: Action.BackendStarted): InitializedState {
		const repository = action.repository;
		const statistics = Statistics.statistics(repository);
		const ordering = Ordering.ordering(repository);
		const content = { type: 'repository' } as RepositoryView;
		const popup = null;
		return { type: 'initialized', repository, statistics, ordering, content, popup };
	}

	private merge_local_repository_update(current: InitializedState, action: Action.RepositoryUpdate): InitializedState {
		const repository = action.updates.reduce(Repository.apply, current.repository);
		const statistics = action.updates.reduce(Statistics.apply, current.statistics);
		const ordering = action.updates.reduce(Ordering.apply, current.ordering);
		return { ...current, repository, statistics, ordering };
	}

	private merge_local_show_task_screen(current: InitializedState, action: Action.ShowTaskScreen): InitializedState {
		if (current.content.type == 'task') {
			return current;
		} else {
			const content = { type: 'task', task: action.task } as TaskView;
			const next = { ...current, content } as InitializedState;
			return next;
		}
	}

	private merge_local_close_task_screen(current: InitializedState, action: Action.CloseTaskScreen): InitializedState {
		if (current.content.type != 'task') {
			throw new Error('cannot close task screen when not showing task screen');
		} else {
			const content = { type: 'repository' } as RepositoryView;
			const next = { ...current, content } as InitializedState;
			return { ...current, content };
		}
	}

	private merge_local_show_creator_popup(current: InitializedState, action: Action.ShowCreatorPopup): InitializedState {
		if (current.popup != null) {
			throw new Error('cannot show creator popup when showing popup');
		} else {
			const mode = 'edit' as 'edit';
			const url = '';
			const path = '';
			const url_error = null;
			const path_error = null;
			const popup = { type: 'creator', mode, url, path, url_error, path_error } as CreatorView;
			const next = { ...current, popup } as InitializedState;
			return next;
		}
	}

	private merge_local_update_creator_popup_url(current: InitializedState, action: Action.UpdateCreatorPopupUrl): InitializedState {
		if (current.popup == null) {
			throw new Error('cannot update creator popup url when not showing popup');
		} else if (current.popup.type != 'creator') {
			throw new Error('cannot update creator popup url when not showing creator popup');
		} else if (current.popup.mode != 'edit') {
			throw new Error('cannot update creator popup url when not showing creator popup in edit mode');
		} else if (current.popup.url == action.url) {
			return current;
		} else {
			const url = action.url;
			const url_error = null;
			const path_error = null;
			const popup = { ...current.popup, url, url_error, path_error } as CreatorView;
			const next = { ...current, popup } as InitializedState;
			return next;
		}
	}

	private merge_local_update_creator_popup_path(current: InitializedState, action: Action.UpdateCreatorPopupPath): InitializedState {
		if (current.popup == null) {
			throw new Error('cannot update creator popup path when not showing popup');
		} else if (current.popup.type != 'creator') {
			throw new Error('cannot update creator popup path when not showing creator popup');
		} else if (current.popup.mode != 'edit') {
			throw new Error('cannot update creator popup path when not showing creator popup in edit mode');
		} else if (current.popup.path == action.path) {
			return current;
		} else {
			const path = action.path;
			const url_error = null;
			const path_error = null;
			const popup = { ...current.popup, path, url_error, path_error } as CreatorView;
			const next = { ...current, popup } as InitializedState;
			return next;
		}
	}

	private merge_local_start_creator_popup_submission(current: InitializedState, action: Action.StartCreatorPopupSubmission): InitializedState {
		if (current.popup == null) {
			throw new Error('cannot start creator popup submission when not showing popup');
		} else if (current.popup.type != 'creator') {
			throw new Error('cannot start creator popup submission when not showing creator popup');
		} else if (current.popup.mode != 'edit') {
			throw new Error('cannot start creator popup submission when not showing creator popup in edit mode');
		} else {
			const mode = 'submit' as 'submit';
			const popup = { ...current.popup, mode } as CreatorView;
			const next = { ...current, popup } as InitializedState;
			return next;
		}
	}

	private merge_local_finish_creator_popup_submission(current: InitializedState, action: Action.FinishCreatorPopupSubmission): InitializedState {
		if (current.popup == null) {
			throw new Error('cannot finish creator popup submission when not showing popup');
		} else if (current.popup.type != 'creator') {
			throw new Error('cannot finish creator popup submission when not showing creator popup');
		} else if (current.popup.mode != 'submit') {
			throw new Error('cannot finish creator popup submission when not showing creator popup in submit mode');
		} else {
			const mode = 'edit' as 'edit';
			const url = '';
			const path = '';
			const url_error = null;
			const path_error = null;
			const popup = { type: 'creator', mode, url, path, url_error, path_error } as CreatorView;
			const next = { ...current, popup } as InitializedState;
			return next;
		}
	}

	private merge_local_fail_creator_popup_submission(current: InitializedState, action: Action.FailCreatorPopupSubmission): InitializedState {
		if (current.popup == null) {
			throw new Error('cannot fail creator popup submission when not showing popup');
		} else if (current.popup.type != 'creator') {
			throw new Error('cannot fail creator popup submission when not showing creator popup');
		} else if (current.popup.mode != 'submit') {
			throw new Error('cannot fail creator popup submission when not showing creator popup in submit mode');
		} else {
			const mode = 'edit' as 'edit';
			const url_error = action.url_error;
			const path_error = action.path_error;
			const popup = { ...current.popup, mode, url_error, path_error } as CreatorView;
			const next = { ...current, popup } as InitializedState;
			return next;
		}
	}

	private merge_local_close_creator_popup(current: InitializedState, action: Action.CloseCreatorPopup): InitializedState {
		if (current.popup != null) {
			if (current.popup.type != 'creator') {
				throw new Error('cannot close creator popup when not showing creator popup');
			} else if (current.popup.mode != 'edit') {
				throw new Error('cannot close creator popup when not showing creator popup in edit mode');
			} else {
				const popup = null;
				const next = { ...current, popup } as InitializedState;
				return next;
			}
		} else {
			return current;
		}
	}

	private consume_remote_action(action: Action.Action) {
		console.log('consume_remote_action', action);

		switch (action.type) {
			case 'backend_started': return this.store.dispatch(action);
			case 'repository_update': return this.store.dispatch(action);
			case 'finish_extract_gallery': return this.consume_remote_finish_extract_gallery(action);
			case 'fail_extract_gallery': return this.consume_remote_fail_extract_gallery(action);
			default: return;
		}
	}

	private consume_remote_finish_extract_gallery(action: Action.FinishExtractGallery) {
		const url = action.url;
		const state = this.store.getState();

		if (state.type != 'initialized') return;
		if (state.popup == null) return;
		if (state.popup.type != 'creator') return;
		if (state.popup.mode != 'submit') return;
		if (state.popup.url != url) return;

		const path = state.popup.path;
		const gallery = action.gallery;
		const title = gallery.title;
		const preview = gallery.preview;

		this.backend.send({ type: 'submit_download', download: { url, path, title, preview }});
		this.store.dispatch({ type: 'finish_creator_popup_submission' });
	}

	private consume_remote_fail_extract_gallery(action: Action.FailExtractGallery) {
		const url = action.url;
		const state = this.store.getState();

		if (state.type != 'initialized') return;
		if (state.popup == null) return;
		if (state.popup.type != 'creator') return;
		if (state.popup.mode != 'submit') return;
		if (state.popup.url != url) return;

		const url_error = action.cause;
		const path_error = null;
		this.store.dispatch({ type: 'fail_creator_popup_submission', url_error, path_error });
	}
}


//////////////////////////////////////////////////////////////////////////
//
// This class represents an IPC channel to the electron main process. The
// frontend uses the channel to communicate with the backend.
//
//////////////////////////////////////////////////////////////////////////

class Backend {
	private channel: string;

	constructor(channel: string) {
		this.channel = channel;
	}

	send(message: Action.Action) {
		ipcRenderer.send(this.channel, message);
	}

	watch(callback: (message: Action.Action) => void): Function {
		const listen = (e: any, message: Action.Action) => { callback(message); };
		const unwatch = () => { ipcRenderer.removeListener(this.channel, listen); };
		ipcRenderer.on(this.channel, listen);
		return unwatch;
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Root
//
//////////////////////////////////////////////////////////////////////////

interface RootData {
	data: State;
}

interface RootProps {
	data: State;
	dispatch: Redux.Dispatch;
}

interface RootActionDispatchers {
	show_task_screen: (task: string) => void;
	close_task_screen: () => void;
	show_creator_popup: () => void;
	update_creator_popup_url: (url: string) => void;
	update_creator_popup_path: (path: string) => void;
	start_creator_popup_submission: () => void;
	close_creator_popup: () => void;
	pause_task: (task: string) => void;
	resume_task: (task: string) => void;
	cancel_task: (task: string) => void;
	repeat_command: (task: string, command: string) => void;
}

const Root = ReactRedux.connect(
	function(state: State): RootData {
		return { data: state };
	}
)(class extends React.PureComponent<RootProps,Empty> {
	constructor(props: RootProps) {
		super(props);
		this.create_action_dispatchers = memoizeOne(this.create_action_dispatchers.bind(this));
	}

	render() {
		const data = this.props.data;
		const dispatchers = this.create_action_dispatchers(this.props.dispatch);

		if (data.type == 'uninitialized') {
			return <LoadScreen />;
		} else {
			let content: React.ReactElement;
			let popup: React.ReactElement | null;

			if (data.content.type == 'repository') {
				content = this.render_repository_content(data.repository, data.ordering, data.content, dispatchers);
			} else if (data.content.type == 'task') {
				content = this.render_task_content(data.repository, data.ordering, data.content, dispatchers);
			} else {
				throw new Error('unreachable');
			}

			if (data.popup == null) {
				popup = null;
			} else if (data.popup.type == 'creator') {
				popup = this.render_creator_popup(data.popup, dispatchers);
			} else {
				throw new Error('unreachable');
			}

			return this.render_main_screen(content, popup, dispatchers);
		}
	}

	private render_main_screen(content: React.ReactElement, popup: React.ReactElement | null, dispatchers: RootActionDispatchers) {
		const on_create = dispatchers.show_creator_popup;
		const props = { content, popup, on_create };
		return <MainScreen {...props} />;
	}

	private render_repository_content(repository: Repository.Repository, ordering: Ordering.Ordering, view: RepositoryView, dispatchers: RootActionDispatchers) {
		const on_show = dispatchers.show_task_screen;
		const order = ordering.tasks;
		const props = { repository, order, on_show };
		return <RepositoryContent {...props} />;
	}

	private render_task_content(repository: Repository.Repository, ordering: Ordering.Ordering, view: TaskView, dispatchers: RootActionDispatchers) {
		const task = view.task;
		const data = repository[task];
		const order = ordering.commands[task];
		const on_pause = dispatchers.pause_task;
		const on_resume = dispatchers.resume_task;
		const on_cancel = dispatchers.cancel_task;
		const on_repeat = dispatchers.repeat_command;
		const on_close = dispatchers.close_task_screen;
		const props = { task, data, order, on_pause, on_resume, on_cancel, on_repeat, on_close };
		return <TaskContent {...props} />;
	}

	private render_creator_popup(view: CreatorView, dispatchers: RootActionDispatchers) {
		const mode = view.mode;
		const url = view.url;
		const path = view.path;
		const url_error = view.url_error;
		const path_error = view.path_error;
		const on_update_url = dispatchers.update_creator_popup_url;
		const on_update_path = dispatchers.update_creator_popup_path;
		const on_submit = dispatchers.start_creator_popup_submission;
		const on_cancel = dispatchers.close_creator_popup;
		const props = { mode, url, path, url_error, path_error, on_update_url, on_update_path, on_submit, on_cancel };
		return <CreatorPopup {...props} />;
	}

	private create_action_dispatchers(dispatch: Redux.Dispatch): RootActionDispatchers {
		return {
			show_task_screen: (task: string) => dispatch({ type: 'show_task_screen', task }),
			close_task_screen: () => dispatch({ type: 'close_task_screen' }),
			show_creator_popup: () => dispatch({ type: 'show_creator_popup' }),
			update_creator_popup_url: (url: string) => dispatch({ type: 'update_creator_popup_url', url }),
			update_creator_popup_path: (path: string) => dispatch({ type: 'update_creator_popup_path', path }),
			start_creator_popup_submission: () => dispatch({ type: 'start_creator_popup_submission' }),
			close_creator_popup: () => dispatch({ type: 'close_creator_popup' }),
			pause_task: (task: string) => dispatch({ type: 'pause_task', task }),
			resume_task: (task: string) => dispatch({ type: 'resume_task', task }),
			cancel_task: (task: string) => dispatch({ type: 'cancel_task', task }),
			repeat_command: (task: string, command: string) => dispatch({ type: 'repeat_command', task, command }),
		};
	}
})


//////////////////////////////////////////////////////////////////////////
//
// Load Screen
//
//////////////////////////////////////////////////////////////////////////

class LoadScreen extends React.PureComponent<Empty,Empty> {
	constructor(props: Empty) {
		super(props);
	}

	render() {
		return <section id="load-screen">
			<div>
				<span>LOADING</span>
			</div>
		</section>;
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Main Screen
//
//////////////////////////////////////////////////////////////////////////

interface MainScreenProps {
	content: React.ReactElement;
	popup: React.ReactElement | null;
	on_create: () => void;
}

class MainScreen extends React.PureComponent<MainScreenProps,Empty> {
	constructor(props: MainScreenProps) {
		super(props);
		this.handle_create_click = memoizeOne(this.handle_create_click.bind(this));
		this.handle_refresh_click = this.handle_refresh_click.bind(this);
	}

	render() {
		const handle_create_click = this.handle_create_click(this.props.on_create);
		const handle_refresh_click = this.handle_refresh_click;

		return <section id="main-screen" className="panel">
			<header>
				<h1>Downloader</h1>
				<nav>
					<button><span className="fa fa-plus" onClick={handle_create_click}></span></button>
					<button><span className="fa fa-refresh" onClick={handle_refresh_click}></span></button>
				</nav>
			</header>
			<div>
				{this.props.content}
			</div>
			{this.props.popup}
		</section>;
	}

	private handle_create_click(on_create: () => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			ev.preventDefault();
			ev.stopPropagation();
			on_create();
		};
	}

	private handle_refresh_click(ev: React.MouseEvent<HTMLButtonElement>) {
		ev.preventDefault();
		ev.stopPropagation();
		location.reload();
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Repository Content
//
//////////////////////////////////////////////////////////////////////////

interface RepositoryContentProps {
	repository: Repository.Repository;
	order: string[];
	on_show: (task: string) => void;
}

class RepositoryContent extends React.PureComponent<RepositoryContentProps,Empty> {
	constructor(props: RepositoryContentProps) {
		super(props);
		this.handle_show_click = memoizeOne(this.handle_show_click.bind(this));
	}

	render() {
		const handle_show_click = this.handle_show_click(this.props.on_show);

		return <section id="repository-content" className="panel content">
			<header>
				<h2>Downloads</h2>
				<nav></nav>
			</header>
			<div>
				<div>
					<table id="repository-task-list" className="list">
						<tbody>
							{transform_map(this.props.repository, Array.from(this.props.order).reverse(), (data, task) => {
								return <tr key={task}>
									<td className="title">{data.title}</td>
									<td className="state">{this.describe_state(data)}</td>
									<td className="actions">
										<button title="More" data-task={task} onClick={handle_show_click}><span className="fa fa-ellipsis-h"></span></button>
									</td>
								</tr>;
							})}
						</tbody>
					</table>
				</div>
			</div>
		</section>;
	}

	private describe_state(data: Repository.Task): string {
		switch (data.state) {
			case 'submitted': return `Submitted ${Moment(data.create_time).fromNow()}`;
			case 'paused': return `Paused ${Moment(data.pause_time).fromNow()}`;
			case 'completed': return `Completed ${Moment(data.complete_time).fromNow()}`;
			case 'cancelled': return `Cancelled ${Moment(data.cancel_time).fromNow()}`;
			default: throw new Error('unreachable');
		}
	}

	private handle_show_click(on_show: (task: string) => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			ev.preventDefault();
			ev.stopPropagation();
			if (typeof ev.currentTarget.dataset.task == 'string') {
				on_show(ev.currentTarget.dataset.task);
			}
		};
	} 
}


//////////////////////////////////////////////////////////////////////////
//
// Task Content
//
//////////////////////////////////////////////////////////////////////////

interface TaskContentProps {
	task: string;
	data: Repository.Task;
	order: string[];
	on_pause: (task: string) => void;
	on_resume: (task: string) => void;
	on_cancel: (task: string) => void;
	on_repeat: (task: string, command: string) => void;
	on_close: () => void;
}

class TaskContent extends React.PureComponent<TaskContentProps,Empty> {
	constructor(props: TaskContentProps) {
		super(props);
		this.handle_open_url_click = this.handle_open_url_click.bind(this);
		this.handle_open_path_click = this.handle_open_path_click.bind(this);
		this.handle_pause_click = memoizeOne(this.handle_pause_click.bind(this));
		this.handle_resume_click = memoizeOne(this.handle_resume_click.bind(this));
		this.handle_cancel_click = memoizeOne(this.handle_cancel_click.bind(this));
		this.handle_repeat_click = memoizeOne(this.handle_repeat_click.bind(this));
		this.handle_close_click = memoizeOne(this.handle_close_click.bind(this));
	}

	render() {
		const task = this.props.task;
		const data = this.props.data;
		const order = this.props.order;
		const handle_pause_click = this.handle_pause_click(this.props.on_pause);
		const handle_resume_click = this.handle_resume_click(this.props.on_resume);
		const handle_cancel_click = this.handle_cancel_click(this.props.on_cancel);
		const handle_repeat_click = this.handle_repeat_click(this.props.on_repeat);
		const handle_close_click = this.handle_close_click(this.props.on_close);
		const handle_open_url_click = this.handle_open_url_click;
		const handle_open_path_click = this.handle_open_path_click;

		return <section id="task-content" className="panel content">
			<header>
				<h2>{data.title}</h2>
				<nav>
					<button title="Open Website" data-url={data.url} onClick={handle_open_url_click}><span className="fa fa-link"></span></button>
					<button title="Open Directory" data-path={data.path} onClick={handle_open_path_click}><span className="fa fa-folder"></span></button>
					{data.state == 'submitted' ? <button title="Pause" data-task={task} onClick={handle_pause_click}><span className="fa fa-pause"></span></button> : null}
					{data.state == 'submitted' ? <button title="Cancel" data-task={task} onClick={handle_cancel_click}><span className="fa fa-minus-circle"></span></button> : null}
					{data.state == 'paused' ? <button title="Resume" data-task={task} onClick={handle_resume_click}><span className="fa fa-play"></span></button> : null}
					{data.state == 'paused' ? <button title="Cancel" data-task={task} onClick={handle_cancel_click}><span className="fa fa-minus-circle"></span></button> : null}
					<button title="Close" onClick={handle_close_click}><span className="fa fa-times"></span></button>
				</nav>
			</header>
			<div>
				<div>
					<div id="task-overview">
						<div><img src={data.preview} /></div>
						<div>
							<div id="task-status">
								<span className={`state state-${data.state}`}>
									{(function(task: string, data: Repository.Task) {
										switch (data.state) {
											case 'submitted': return <span className="fa fa-play"></span>;
											case 'paused': return <span className="fa fa-pause"></span>;
											case 'completed': return <span className="fa fa-check"></span>;
											case 'cancelled': return <span className="fa fa-times"></span>;
										}
									})(task, data)}
								</span>
								<span className="total" title="All Operations">{data.scheduled + data.launched + data.finished}</span>
								<span className="scheduled" title="Pending Operations">{data.scheduled}</span>
								<span className="launched" title="Running Operations">{data.launched}</span>
								<span className="finished" title="Finished Operations">{data.finished}</span>
							</div>
							<table id="task-details">
								<tr><td>URL</td><td>{data.url}</td></tr>
								<tr><td>Path</td><td>{data.path}</td></tr>
								<tr><td>Created At</td><td>{Moment(data.create_time).fromNow()}</td></tr>
								<tr><td>Last Active At</td><td>{Moment(data.active_time).fromNow()}</td></tr>
								{(data.state == 'paused' ? <tr><td>Paused At</td><td>{Moment(data.pause_time).fromNow()}</td></tr> : null)}
								{(data.state == 'completed' ? <tr><td>Completed At</td><td>{Moment(data.complete_time).fromNow()}</td></tr> : null)}
								{(data.state == 'cancelled' ? <tr><td>Cancelled At</td><td>{Moment(data.cancel_time).fromNow()}</td></tr> : null)}
							</table>
						</div>
					</div>
					<table id="task-command-list" className="list">
						<tbody>
							{transform_map(data.commands, order, (data, command) => {
								return <tr key={command}>
									<td className="title">{this.describe_operation(data)}</td>
									<td className="state">{this.describe_state(data)}</td>
									<td className="actions">
										<button title="Repeat" disabled={data.state!= 'finished'}><span className="fa fa-repeat"></span></button>
									</td>
								</tr>;
							})}
						</tbody>
					</table>
				</div>
			</div>
		</section>;
	}

	private describe_operation(data: Repository.Command): string {
		switch (data.type) {
			case 'save': return `Save Asset ${data.url}`;
			case 'visit': return `Visit Page ${data.url}`;
			default: throw new Error('unreachable');
		}
	}

	private describe_state(data: Repository.Command): string {
		switch (data.state) {
			case 'scheduled': return `Scheduled ${Moment(data.create_time).fromNow()}`;
			case 'launched': return `Launched ${Moment(data.launch_time).fromNow()}`;
			case 'finished': return `Finished ${Moment(data.finish_time).fromNow()}`;
			default: throw new Error('unreachable');
		}
	}

	private handle_open_url_click(ev: React.MouseEvent<HTMLButtonElement>) {
		if (typeof ev.currentTarget.dataset.url == 'string') {
			ev.preventDefault();
			ev.stopPropagation();
			shell.openExternal(ev.currentTarget.dataset.url);
		}
	}

	private handle_open_path_click(ev: React.MouseEvent<HTMLButtonElement>) {
		if (typeof ev.currentTarget.dataset.path == 'string') {
			ev.preventDefault();
			ev.stopPropagation();
			shell.openItem(ev.currentTarget.dataset.path);
		}
	}

	private handle_pause_click(on_pause: (task: string) => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			if (typeof ev.currentTarget.dataset.task == 'string') {
				ev.preventDefault();
				ev.stopPropagation();
				on_pause(ev.currentTarget.dataset.task);
			}
		};
	}

	private handle_resume_click(on_resume: (task: string) => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			if (typeof ev.currentTarget.dataset.task == 'string') {
				ev.preventDefault();
				ev.stopPropagation();
				on_resume(ev.currentTarget.dataset.task);
			}
		};
	}

	private handle_cancel_click(on_cancel: (task: string) => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			if (typeof ev.currentTarget.dataset.task == 'string') {
				ev.preventDefault();
				ev.stopPropagation();
				on_cancel(ev.currentTarget.dataset.task);
			}
		};
	}

	private handle_repeat_click(on_repeat: (task: string, command: string) => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			if (typeof ev.currentTarget.dataset.task == 'string') {
				if (typeof ev.currentTarget.dataset.command == 'string') {
					ev.preventDefault();
					ev.stopPropagation();
					on_repeat(ev.currentTarget.dataset.task, ev.currentTarget.dataset.command);
				}
			}
		};
	}

	private handle_close_click(on_close: () => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			ev.preventDefault();
			ev.stopPropagation();
			on_close();
		};
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Creator Popup
//
//////////////////////////////////////////////////////////////////////////

interface HTMLInputElementEx extends HTMLInputElement {
	webkitdirectory?: boolean;
}

interface CreatorPopupProps {
	mode: 'edit' | 'submit';
	url: string;
	path: string;
	url_error: string | null;
	path_error: string | null;
	on_update_url: (url: string) => void;
	on_update_path: (path: string) => void;
	on_submit: () => void;
	on_cancel: () => void;
}

class CreatorPopup extends React.Component<CreatorPopupProps,Empty> {
	private ref: React.RefObject<HTMLInputElementEx>;

	constructor(props: CreatorPopupProps) {
		super(props);
		this.ref = React.createRef();
		this.handle_url_change = memoizeOne(this.handle_url_change.bind(this));
		this.handle_path_change = memoizeOne(this.handle_path_change.bind(this));
		this.handle_submit_click = memoizeOne(this.handle_submit_click.bind(this));
		this.handle_cancel_click = memoizeOne(this.handle_cancel_click.bind(this));
	}

	shouldComponentUpdate(props: CreatorPopupProps, state: Empty) {
		if (props.mode !== this.props.mode) return true;
		if (props.url == '' && this.props.url != '') return true;
		if (props.url != '' && this.props.url == '') return true;
		if (props.path == '' && this.props.path != '') return true;
		if (props.path != '' && this.props.path == '') return true;
		if (props.url_error !== this.props.url_error) return true;
		if (props.path_error !== this.props.path_error) return true;
		if (props.on_update_url !== this.props.on_update_url) return true;
		if (props.on_update_path !== this.props.on_update_path) return true;
		if (props.on_submit !== this.props.on_submit) return true;
		if (props.on_cancel !== this.props.on_cancel) return true;
		return false;
	}

	render() {
		const form_props = (this.props.mode == 'submit' ? { disabled: true } : {});
		const url_props = (this.props.url == '' ? { value: '' } : {});
		const path_props = (this.props.path == '' ? { value: '' } : {});
		const url_help = (this.props.url_error ? this.props.url_error : "Please enter the URL to download");
		const path_help = (this.props.path_error? this.props.path_error : "Please select the directory where files are saved");

		const handle_url_change = this.handle_url_change(this.props.on_update_url);
		const handle_path_change = this.handle_path_change(this.props.on_update_path);
		const handle_submit_click = this.handle_submit_click(this.props.on_submit);
		const handle_cancel_click = this.handle_cancel_click(this.props.on_cancel);
	
		return <section id="creator-popup" className="popup">
			<div>
				<header><h2>New Download</h2></header>
				<form>
					<div className="input url" title={url_help}>
						<span className="icon"><span className="fa fa-link"></span></span>
						<input className="control" type="text" name="url" onChange={handle_url_change} {...url_props} {...form_props} />
					</div>
					<div className="input path" title={path_help}>
						<span className="icon"><span className="fa fa-save"></span></span>
						<span className="control">{this.props.path}</span>
						<input className="hidden" type="file" name="path" id="creator_popup_path" onChange={handle_path_change} {...path_props} {...form_props} ref={this.ref} />
						<label className="icon" htmlFor="creator_popup_path"><span className="fa fa-folder"></span></label>
					</div>
				</form>
				<footer>
					<button type="button" onClick={handle_submit_click} {...form_props}>Submit</button>
					<button type="button" onClick={handle_cancel_click} {...form_props}>Cancel</button>
				</footer>
			</div>
		</section>;
	}

	componentDidMount() {
		if (this.ref.current != null) {
			this.ref.current.webkitdirectory = true;
		}
	}

	private handle_url_change(on_update_url: (url: string) => void) {
		return (ev: React.FormEvent<HTMLInputElement>) => {
			ev.preventDefault();
			ev.stopPropagation();
			on_update_url(ev.currentTarget.value);
		};
	}

	private handle_path_change(on_update_path: (path: string) => void) {
		return (ev: React.FormEvent<HTMLInputElement>) => {
			ev.preventDefault();
			ev.stopPropagation();

			if (ev.currentTarget.files == null) {
				on_update_path('');
			} else if (ev.currentTarget.files.length == 0) {
				on_update_path('');
			} else {
				on_update_path(ev.currentTarget.files[0].path);
			}
		};
	}

	private handle_submit_click(on_submit: () => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			ev.preventDefault();
			ev.stopPropagation();
			on_submit();
		};
	}

	private handle_cancel_click(on_cancel: () => void) {
		return (ev: React.MouseEvent<HTMLButtonElement>) => {
			ev.preventDefault();
			ev.stopPropagation();
			on_cancel();
		};
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Helper function to perform map to array transformation with sort order
// determined by the given array.
//
//////////////////////////////////////////////////////////////////////////

function transform_map<Input,Output>(items: { [k:string]: Input }, order: string[], callback: (value: Input, key: string) => Output): Output[] {
	let input = { ...items };
	let output = [] as Output[];

	for (const key of order) {
		if (input.hasOwnProperty(key)) {
			output.push(callback(input[key], key));
			delete input[key];
		}
	}

	for (const key of Object.keys(input)) {
		output.push(callback(input[key], key));
	}

	return output;
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	Frontend as default,
	Frontend
}


