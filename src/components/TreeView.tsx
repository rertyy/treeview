import { memo, useState } from "react";

export type Selected = "Unselected" | "Partial" | "Selected";

type RenderNodeProps = {
  node: Node;
};

export type Node = {
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
  const [count, setCount] = useState(0);

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

  const addChild = (parent: Node) => {
    const uuid = crypto.randomUUID();
    const newChild: Node = {
      key: uuid,
      data: uuid,
      children: [],
      level: parent.level + 1,
      isOpen: true,
      selectedState: "Unselected",
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

  const toggleNode = (node: Node) => {
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

    setTree((prev) => {
      return {
        ...prev,
        nodes: newNodes,
      };
    });
  };

  const resetTree = () => {
    setTree(createDefaultTreeView());
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

    // Modify parents
    if (node.parent !== undefined) {
      let curr: Node | null = tree.nodes[node.parent];

      while (curr) {
        const childStates = curr.children.map(
          (key) => updatedNodes[key].selectedState,
        );
        const nextState: Selected = childStates.every((s) => s === "Selected")
          ? "Selected"
          : childStates.every((s) => s === "Unselected")
            ? "Unselected"
            : "Partial";

        updatedNodes[curr.key] = {
          ...curr,
          selectedState: nextState,
        };

        curr = curr.parent ? tree.nodes[curr.parent] : null;
      }
    }

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

    const newNodeMap = nodeArrToMap(newNodes);

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
      <div style={{ paddingLeft: `${node.level * 1.5}rem` }}>
        <button onClick={() => addChild(node)}>Add</button>
        <button onClick={() => setRoot(node)}>SetRoot</button>
        <button onClick={() => deleteNode(node)}>Del</button>
        <button onClick={() => editNodeData(node, crypto.randomUUID())}>
          Edit
        </button>
        <button onClick={() => setSelected(node)}>{node.selectedState}</button>
        <button onClick={() => foldRecursively(node)}>Fold all</button>
        <button onClick={() => expandRecursively(node)}>Expand all</button>
        <button
          disabled={node.children.length === 0}
          onClick={() => toggleNode(node)}
        >
          {node.children.length === 0
            ? "No children"
            : node.isOpen
              ? "Collapse"
              : "Expand"}
        </button>

        <textarea defaultValue={node.data} />
        {node.isOpen &&
          node.children.map((childId) => {
            const childNode = tree.nodes[childId];
            return <MemoRender node={childNode} key={childNode?.key} />;
          })}
      </div>
    );
  };

  const MemoRender = memo(RenderNode);

  return (
    <div style={{}}>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <button onClick={resetTree}>Reset to default</button>
      <button onClick={deleteSelected}>Delete Selected</button>
      <button onClick={() => foldRecursively(rootNode)}>
        Fold all recursively
      </button>
      <button onClick={() => expandRecursively(rootNode)}>
        Expand all recursively
      </button>
      <div>Hello</div>
      <MemoRender node={rootNode} />
    </div>
  );
};

export default TreeView;
