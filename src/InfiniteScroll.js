import React from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, View, FlatList, Dimensions, Text } from 'react-native';

import { Indicator, Error, StatusBar } from './res';

import css from './css';


export default class InfiniteScroll extends React.Component {

	static propTypes = {
		items: PropTypes.array.isRequired,
		width: PropTypes.oneOfType([ PropTypes.string, PropTypes.number ]),
		stamp: PropTypes.number,

		useScrollEvent: PropTypes.bool,
		useRefresh: PropTypes.bool,
		useFullHeight: PropTypes.bool,
		useDebug: PropTypes.bool,

		column: PropTypes.number,
		innerMargin: PropTypes.number,
		outerMargin: PropTypes.number,
		endReachedPosition: PropTypes.number,
		pageSize: PropTypes.number,
		keyExtractor: PropTypes.string,
		type: PropTypes.string,
		load: PropTypes.func,

		renderRow: PropTypes.func.isRequired,
		renderHeader: PropTypes.func,
		renderFooter: PropTypes.func,
		renderError: PropTypes.func,

		style: ViewPropTypes.style,
		styleList: ViewPropTypes.style,
		styleRow: ViewPropTypes.style,
		styleBlock: ViewPropTypes.style,
	};
	static defaultProps = {
		items: null,
		width: 'auto',
		stamp: null, // 강제로 렌더링 하기위한 장치. 현재와 다른값으로 변하면 렌더링하게 된다.

		useScrollEvent: true,
		useRefresh: true,
		useFullHeight: true,
		useDebug: false,

		column: 1,
		innerMargin: 0,
		outerMargin: 0,
		endReachedPosition: 2,
		pageSize: 20,
		keyExtractor: null,
		type: 'end', // loading|refresh|ready|end|error
		load: function(type) {},

		renderRow: null,
		renderHeader: null,
		renderFooter: null,
		renderError: () => <Error/>,

		style: null,
		styleList: null,
		styleRow: null,
		styleBlock: null,
	};

	constructor(props) {
		super(props);

		this._list = null;
		this._statusBar = null;
		this.itemSize = 0;
		this.windowSize = { width: 0, height: 0 };
	}

	/**
	 * LIFE CYCLE AREA
	 */
	componentWillMount() {
		this.updateSize(this.props);
	}
	componentWillUpdate(nextProps) {
		const { props } = this;

		if (
			nextProps.column !== props.column ||
			nextProps.innerMargin !== props.innerMargin ||
			nextProps.outerMargin !== props.outerMargin ||
			nextProps.width !== props.width
		) {
			this.updateSize(nextProps);
		}
	}
	shouldComponentUpdate(nextProps) {
		const { props } = this;

		if (props.items !== nextProps.items) return true;
		if (props.type !== nextProps.type) return true;
		if (props.stamp !== nextProps.stamp) return true;

		return false;
	}

	/**
	 * FUNCTIONS AREA
	 */

	/**
	 * get inner margin
	 *
	 * @param {Number} innerMargin
	 * @return {Number}
	 */
	getInnerMargin(innerMargin=null) {
		return (this.props.column > 1) ? (innerMargin || this.props.innerMargin) : 0;
	}

	/**
	 * get item size
	 *
	 * @return {Number}
	 */
	getItemSize(props) {
		let width = props.width === 'auto' ? this.windowSize.width : props.width;
		let innerMargin = (props.column - 1) * this.getInnerMargin(props.innerMargin);

		return props.column > 1 ? (width - (innerMargin + (props.outerMargin * 2))) / props.column : 'auto';
	}

	/**
	 * update viewport and block size
	 *
	 * @param {Object} props
	 */
	updateSize(props) {
		this.windowSize = Dimensions.get('window');
		this.itemSize = this.getItemSize(props);
	}

	/**
	 * RENDER AREA
	 */
	renderRow(o) {
		const { props } = this;

		return (
			<View style={[
				css.block,
				props.styleBlock,
				{
					width: this.itemSize, marginLeft: this.getInnerMargin(),
					marginTop: (props.column <= o.index) ? props.innerMargin : 0,
				}
			]}>
				{props.renderRow({
					item: o.item,
					index: o.index,
					size: this.itemSize === 'auto' ? this.windowSize.width : this.itemSize
				})}
			</View>
		);
	}
	renderHeader() {
		const { props } = this;

		return (
			<View style={[
				css.header,
				!!props.outerMargin && { marginBottom: props.outerMargin }
			]}>
				{!!props.renderHeader && props.renderHeader()}
			</View>
		);
	}
	renderFooter() {
		const { props } = this;

		return (
			<View style={[
				css.footer,
				!!props.outerMargin && { marginTop: props.outerMargin }
			]}>
				{!!props.renderFooter && props.renderFooter()}
				{props.type === 'loading' && (
					<Indicator style={css.footer__loading}/>
				)}
			</View>
		);
	}
	render() {
		const { props } = this;

		return (
			<View style={[
				css.viewport,
				props.style,
				props.useFullHeight && css.viewport_fullHeight
			]}>
				{!(props.items && props.items.length) && props.renderError()}

				<FlatList
					ref={(r) => { this._list = r; }}
					data={props.items}
					keyExtractor={props.keyExtractor ? props.keyExtractor : (item, index) => `item-${index}`}
					initialNumToRender={props.pageSize}
					renderItem={this.renderRow.bind(this)}
					ListHeaderComponent={this.renderHeader.bind(this)}
					ListFooterComponent={this.renderFooter.bind(this)}
					numColumns={props.column}
					columnWrapperStyle={props.column > 1 && [
						{ marginLeft: 0 - this.getInnerMargin() + props.outerMargin },
						props.styleRow
					]}
					debug={props.useDebug}
					refreshing={props.useRefresh && props.type === 'refresh'}
					onRefresh={props.useRefresh ? function() { props.load('refresh'); } : null}
					removeClippedSubviews={false}
					onEndReachedThreshold={props.endReachedPosition}
					onEndReached={function() {
						if (props.useScrollEvent && props.type === 'ready') {
							props.load('more');
						}
					}}
					style={[ css.list, props.styleList ]}/>

				<StatusBar
					ref={(r) => { this._statusBar = r; }}
					style={css.statusBar}/>
			</View>
		);
	}

	/**
	 * METHOD AREA
	 */

	/**
	 * scroll to offset
	 *
	 * @param {Object} options
	 */
	scrollToOffset(options={}) {
		this._list.scrollToOffset({
			x: 0,
			y: 0,
			animated: true,
			...options
		});
	}

	/**
	 * trigger message
	 *
	 * @param {String} color
	 * @param {String} message
	 */
	triggerMessage(color, message) {
		this._statusBar.open(color, message);
	}

}