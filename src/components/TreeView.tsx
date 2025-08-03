import { memo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsRight,
  CirclePlus,
  Edit2,
  Trash2,
  Upload,
} from "lucide-react";
import "./TreeView.css";

export type Selected = "Unselected" | "Partial" | "Selected";

type RenderNodeProps = {
  node: Node;
};

type Node = {
  key: string;
  data: string;
  children: string[];
  level: number;
  isOpen: boolean;
  selectedState: Selected;
  parent?: string;
};

type NodeMap = {
  [key: string]: Node;
};

type TreeState = {
  nodes: NodeMap;
  rootId: string;
};

const nodeArrToMap = (nodes: Node[]) => {
  const emptyTreeState: NodeMap = {};
  return nodes.reduce((map, n) => {
    map[n.key] = n;
    return map;
  }, emptyTreeState);
};

const setClosed = (n: Node): Node => ({ ...n, isOpen: false });
const setOpen = (n: Node): Node => ({ ...n, isOpen: true });

const createDefaultTreeView = (): TreeState => {
  const rootId = crypto.randomUUID();
  return {
    rootId,
    nodes: {
      [rootId]: {
        key: rootId,
        data: "Root",
        children: [],
        level: 0,
        isOpen: true,
        selectedState: "Unselected",
      },
    },
  };
};

const TreeView = () => {
  const [tree, setTree] = useState<TreeState>(createDefaultTreeView());
  const rootNode = tree.nodes[tree.rootId];
  const [id, setId] = useState(2);

  const modifyRecursively = (parent: Node, updater: (n: Node) => Node) => {
    const updatedNodes = { ...tree.nodes };
    const modify = (key: string) => {
      updatedNodes[key] = { ...updater(updatedNodes[key]) };
      updatedNodes[key].children.forEach(modify);
    };
    modify(parent.key);
    setTree((prevTree) => {
      const newTree: TreeState = { ...prevTree, nodes: updatedNodes };
      return newTree;
    });
  };

  const foldRecursively = (parent: Node) => {
    modifyRecursively(parent, setClosed);
  };

  const expandRecursively = (parent: Node) => {
    modifyRecursively(parent, setOpen);
  };

  const addChild = (parent: Node, data: string) => {
    const uuid = crypto.randomUUID();
    const childState =
      parent.selectedState === "Selected" ? "Selected" : "Unselected";

    const newChild: Node = {
      key: uuid,
      data: data,
      children: [],
      level: parent.level + 1,
      isOpen: true,
      selectedState: childState,
      parent: parent.key,
    };

    setTree((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [uuid]: newChild,
        [parent.key]: {
          ...prev.nodes[parent.key],
          children: [...parent.children, uuid],
        },
      },
    }));
  };

  const toggleChildrenVisibility = (node: Node) => {
    setTree((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [node.key]: {
          ...prev.nodes[node.key],
          isOpen: !node.isOpen,
        },
      },
    }));
  };

  const deleteNode = (node: Node) => {
    if (node.key === tree.rootId) {
      console.log("Cannot delete root");
      return;
    }

    const newNodes = { ...tree.nodes };
    const parent = newNodes[node.parent!];
    newNodes[parent.key] = {
      ...parent,
      children: parent.children.filter((k) => k !== node.key),
    };

    const stack = [node.key];
    while (stack.length > 0) {
      const key = stack.pop()!;
      const children = newNodes[key]?.children ?? [];
      for (const child of children) {
        stack.push(child);
      }
      delete newNodes[key];
    }

    updateParentCheckboxes(parent.key, newNodes);

    setTree((prev) => {
      return {
        ...prev,
        nodes: newNodes,
      };
    });
  };

  const resetTree = () => {
    setId(2);
    setTree(createDefaultTreeView());
  };

  const updateParentCheckboxes = (
    node_key: string | undefined,
    updatedNodes: NodeMap,
  ) => {
    // in-place update of checkbox state
    if (!node_key) {
      return;
    }

    let curr: Node | null = updatedNodes[node_key];

    while (curr) {
      const childStates = curr.children.map(
        (key) => updatedNodes[key].selectedState,
      );

      const nextState: Selected =
        childStates.length === 0
          ? "Unselected"
          : childStates.every((s) => s === "Selected")
            ? "Selected"
            : childStates.every((s) => s === "Unselected")
              ? "Unselected"
              : "Partial";

      updatedNodes[curr.key] = {
        ...curr,
        selectedState: nextState,
      };

      curr = curr.parent ? updatedNodes[curr.parent] : null;
    }

    return updatedNodes;
  };
  const setSelected = (node: Node) => {
    // If Selected, select all children
    // Update parents to Partial or Selected accordingly
    // If Unselected, deselect all children
    // Update parents to Partial or Deselected accordingly

    const updatedNodes = { ...tree.nodes };
    const toggleTo: Selected =
      node.selectedState === "Selected" ? "Unselected" : "Selected";

    // Modify children
    const modify = (key: string) => {
      updatedNodes[key] = { ...updatedNodes[key], selectedState: toggleTo };
      updatedNodes[key].children.forEach(modify);
    };
    modify(node.key);

    updateParentCheckboxes(node.parent, updatedNodes);

    setTree((prev) => ({
      ...prev,
      nodes: updatedNodes,
    }));
  };

  const editNodeData = (node: Node, data: string) => {
    setTree((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [node.key]: {
          ...prev.nodes[node.key],
          data: data,
        },
      },
    }));
  };
  const deleteSelected = () => {
    const rootNode = tree.nodes[tree.rootId];
    if (rootNode.selectedState === "Selected") {
      console.log("Cannot delete root");
      alert("Cannot delete root node");
      return;
    }

    const newNodes: Node[] = [];
    const stack: Node[] = [rootNode];
    while (stack.length) {
      const curr = stack.pop()!;
      const childList: string[] = [];
      for (const childKey of curr.children) {
        const childNode = tree.nodes[childKey];
        if (childNode.selectedState !== "Selected") {
          stack.push(childNode);
          childList.push(childNode.key);
        }
      }
      newNodes.push({ ...curr, children: childList });
    }

    const newNodesUpdated: Node[] = newNodes.map((node) => ({
      ...node,
      selectedState: "Unselected",
    }));

    const newNodeMap = nodeArrToMap(newNodesUpdated);

    setTree((prev) => ({
      ...prev,
      nodes: newNodeMap,
    }));
  };

  const setRoot = (root: Node) => {
    const validNodes: NodeMap = {};

    const stack: string[] = [root.key];
    while (stack.length) {
      const nodeId = stack.pop()!;
      const node = tree.nodes[nodeId];
      validNodes[node.key] = node;

      for (const key of node.children) {
        stack.push(key);
      }
    }
    const newTreeState: TreeState = {
      rootId: root.key,
      nodes: validNodes,
    };
    setTree(newTreeState);
  };

  const RenderNode = ({ node }: RenderNodeProps) => {
    return (
      <div className="tree-node">
        <div className="tree-node-content">
          <div className="tree-node-actions">
            <button
              onClick={() => setRoot(node)}
              title="Set as root"
              aria-label="Set this node as root"
              className="tree-action-btn"
            >
              <Upload size={16} />
            </button>

            <button
              onClick={() => {
                setId(id + 1);
                addChild(node, id.toString(10));
              }}
              title="Add child"
              aria-label="Add child node"
              className="tree-action-btn"
            >
              <CirclePlus size={16} />
            </button>

            <button
              onClick={() => deleteNode(node)}
              title={
                node.key === tree.rootId
                  ? "Cannot delete root node"
                  : "Delete node"
              }
              aria-label="Delete this node"
              className="tree-action-btn"
              disabled={tree.rootId === node.key}
            >
              <Trash2 size={16} />
            </button>

            <button
              onClick={() => editNodeData(node, crypto.randomUUID())}
              title="Edit node data"
              aria-label="Edit node data"
              className="tree-action-btn"
            >
              <Edit2 size={16} />
            </button>

            <button
              onClick={() => foldRecursively(node)}
              title="Fold all"
              aria-label="Fold all children recursively"
              className="tree-action-btn"
            >
              <ChevronsRight size={16} />
            </button>

            <button
              onClick={() => expandRecursively(node)}
              title="Expand all"
              aria-label="Expand all children recursively"
              className="tree-action-btn"
            >
              <ChevronsDown size={16} />
            </button>

            <button
              onClick={() => toggleChildrenVisibility(node)}
              title={node.isOpen ? "Collapse node" : "Expand node"}
              aria-label={node.isOpen ? "Collapse node" : "Expand node"}
              className="tree-action-btn"
              disabled={node.children.length === 0}
            >
              {!node.isOpen ? (
                <ChevronRight size={16} />
              ) : node.children.length === 0 ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          </div>

          <label className="tree-checkbox-label" title="Select node">
            <input
              type="checkbox"
              checked={node.selectedState === "Selected"}
              ref={(input) => {
                if (input && node.selectedState === "Partial") {
                  input.indeterminate = true;
                }
              }}
              aria-label="Select this node"
              onChange={() => setSelected(node)}
              className="tree-checkbox"
            />
          </label>

          <span className="tree-node-text">{node.data}</span>
        </div>

        {node.isOpen && node.children.length > 0 && (
          <div className="tree-children">
            {node.children.map((childId) => {
              const childNode = tree.nodes[childId];
              return <MemoRender node={childNode} key={childNode?.key} />;
            })}
          </div>
        )}
      </div>
    );
  };

  const MemoRender = memo(RenderNode);

  return (
    <div className="tree-view">
      <div className="tree-controls">
        <div className="tree-control-btn">
          Number of nodes: {Object.keys(tree.nodes).length}
        </div>
        <button className="tree-control-btn" onClick={resetTree}>
          Reset Tree
        </button>
        <button className="tree-control-btn" onClick={deleteSelected}>
          Delete Selected
        </button>
        <button
          className="tree-control-btn"
          onClick={() => foldRecursively(rootNode)}
        >
          Fold All
        </button>
        <button
          className="tree-control-btn"
          onClick={() => expandRecursively(rootNode)}
        >
          Expand All
        </button>
      </div>

      <div className="tree-container">
        <MemoRender node={rootNode} />
      </div>
    </div>
  );
};

export default TreeView;
