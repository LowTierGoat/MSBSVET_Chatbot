# Replace this entirely in app/visuals.py

def suggest_viz(results: list) -> dict | None:
    if not results or len(results) == 0:
        return None

    keys = list(results[0].keys())
    num_cols = [k for k in keys if isinstance(results[0][k], (int, float))]
    text_cols = [k for k in keys if isinstance(results[0][k], str)]

    if not num_cols:
        return None

    # 1. Wide Format (e.g., Region, AutoCAD_Intake, Licentiate_Intake)
    if len(num_cols) > 1 and len(text_cols) >= 1:
        return {"type": "multi_pie", "x": text_cols[0], "y": num_cols}

    # 2. Long/Grouped Format (e.g., Region, Course Name, Intake)
    if len(text_cols) >= 2 and len(num_cols) == 1:
        return {
            "type": "grouped_pie", 
            "x": text_cols[0], 
            "groupBy": text_cols[1], 
            "y": num_cols[0]
        }

    # 3. Standard Single Chart
    if len(text_cols) >= 1 and len(num_cols) == 1:
        return {"type": "pie" if len(results) <= 6 else "bar", "x": text_cols[0], "y": num_cols[0]}

    return None

# Keep for backward compatibility if anything still imports this
def format_chart_config(params: dict) -> dict:
    return {
        "type": params.get("chart_type", "bar"),
        "x": params.get("x_axis"),
        "y": params.get("y_axis"),
    }